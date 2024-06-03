package main

import (
	"github.com/Noah-Huppert/gointerrupt"
	"github.com/Noah-Huppert/role-bot/config"
	"github.com/Noah-Huppert/role-bot/discord"
	"github.com/Noah-Huppert/role-bot/models"
	"github.com/Noah-Huppert/role-bot/services"

	"go.uber.org/zap"

	"context"
	stdLog "log"
)

// https://github.com/gin-gonic/gin
// https://github.com/appleboy/gin-jwt

func main() {
	ctxPair := gointerrupt.NewCtxPair(context.Background())

	// Logger
	logger, err := zap.NewDevelopment()
	if err != nil {
		stdLog.Fatal("failed to create logger: %s", err)
	}
	defer func() {
		if err := logger.Sync(); err != nil {
			stdLog.Fatal("failed to sync logger output: %s", err)
		}
	}()

	// Configuration
	cfg := config.Config{}

	if err := cfg.Load(); err != nil {
		logger.Fatal("failed to load configuration", zap.Error(err))
	}

	// Connect to Discord
	discordRes, err := discord.NewDiscordClient(cfg.DiscordAPIToken)
	if err != nil {
		logger.Fatal("failed to create Discord client", zap.Error(err))
	}
	logger.Debug("waiting for Discord client to connect successfully")
	<-discordRes.Ready

	// Models
	logger.Info("connecting to database")

	db, err := models.DBConnect(cfg.PostgresURI)
	if err != nil {
		logger.Fatal("failed to connect to Postgres", zap.Error(err))
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
		Logger: logger.With(zap.String("component", "discord")),
		Cfg: discord.DiscordConfig{
			ClientID: cfg.DiscordClientID,
			GuildID:  cfg.DiscordGuildID,
		},
		Svcs:    svcs,
		Discord: discordRes.Discord,
	})

	if err = discord.Setup(); err != nil {
		logger.Fatal("failed to setup Discord", zap.Error(err))
	}

	// Gracefully cleanup
	defer func() {
		if err = discord.Cleanup(); err != nil {
			logger.Fatal("failed to cleanup Discord adapter", zap.Error(err))
		}
		logger.Info("graceful shutdown success")
	}()

	// Wait for bot to be shut down
	<-ctxPair.Graceful().Done()
}
