package main

import (
	"github.com/Noah-Huppert/gointerrupt"
	"github.com/Noah-Huppert/golog"

	"github.com/Noah-Huppert/role-bot/config"
	"github.com/Noah-Huppert/role-bot/discord"
	"github.com/Noah-Huppert/role-bot/models"

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

	// Models
	db, err := models.DBConnect(cfg.PostgresURI)
	if err != nil {
		logger.Fatalf("failed to connect to Postgres: %s", err)
	}

	repos := models.Repos{
		RoleList: models.NewPGRoleListRepo(db),
	}

	// Discord
	discord, err := discord.NewDiscordAdapter(discord.DiscordAdapterOpts{
		Logger: logger.GetChild("discord"),
		Cfg: discord.DiscordConfig{
			ClientID: cfg.DiscordClientID,
			APIToken: cfg.DiscordAPIToken,
			GuildID:  cfg.DiscordGuildID,
		},
		Repos: repos,
	})
	if err != nil {
		logger.Fatalf("failed to initialized Discord adapter: %s", err)
	}

	if err = discord.Setup(); err != nil {
		logger.Fatalf("failed to setup Discord commands: %s", err)
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
