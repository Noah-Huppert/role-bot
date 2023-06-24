package main

import (
	"github.com/Noah-Huppert/gointerrupt"
	"github.com/Noah-Huppert/golog"

	"github.com/Noah-Huppert/role-bot/config"
	"github.com/Noah-Huppert/role-bot/discord"
	"github.com/Noah-Huppert/role-bot/models"
	"github.com/Noah-Huppert/role-bot/services"

	"context"
)

func main() {
	ctxPair := gointerrupt.NewCtxPair(context.Background())

	// Logger
	logger := golog.NewLogger("role-bot")

	// Configuration
	cfg := config.Config{}

	if err := cfg.Load(); err != nil {
		logger.Fatalf("failed to load configuration: %s", err)
	}

	// Connect to Discord
	discordRes, err := discord.NewDiscordClient(cfg.DiscordAPIToken)
	if err != nil {
		logger.Fatalf("failed to create Discord client: %s", err.Error())
	}
	logger.Debug("waiting for Discord client to connect successfully")
	<-discordRes.Ready

	// Models
	logger.Info("connecting to database")

	db, err := models.DBConnect(cfg.PostgresURI)
	if err != nil {
		logger.Fatalf("failed to connect to Postgres: %s", err)
	}

	repos := models.Repos{
		RoleList: models.NewPGRoleListRepo(db),
		RoleCache: models.NewExternalRoleCache(models.NewExternalRoleCacheOpts{
			Cache: models.NewPGRoleRepo(db),
			External: discord.NewDiscordRoleRepo(discord.NewDiscordRoleRepoOpts{
				Discord: discordRes.Discord,
				GuildID: cfg.DiscordGuildID,
			}),
		}),
	}
	svcs := services.Services{
		RoleList: services.NewRoleListSvc(services.NewRoleListSvcOpts{
			RoleListRepo: repos.RoleList,
			RoleCache:    repos.RoleCache,
		}),
	}

	logger.Info("connected to database")

	// Discord
	logger.Info("setting up Discord")

	discord := discord.NewDiscordAdapter(discord.DiscordAdapterOpts{
		Logger: logger.GetChild("discord"),
		Cfg: discord.DiscordConfig{
			ClientID: cfg.DiscordClientID,
			GuildID:  cfg.DiscordGuildID,
		},
		Svcs:    svcs,
		Discord: discordRes.Discord,
	})

	if err = discord.Setup(); err != nil {
		logger.Fatalf("failed to setup Discord: %s", err)
	}

	// Gracefully cleanup
	defer func() {
		if err = discord.Cleanup(); err != nil {
			logger.Fatalf("failed to cleanup Discord adapter: %s", err)
		}
		logger.Info("graceful shutdown success")
	}()

	// Wait for bot to be shut down
	<-ctxPair.Graceful().Done()
}
