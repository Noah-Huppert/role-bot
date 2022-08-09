package main

import (
	"github.com/Noah-Huppert/golog"
	"github.com/bwmarrin/discordgo"

	"github.com/Noah-Huppert/role-bot/config"

	"fmt"
)

func main() {
	// Logger
	logger := golog.NewLogger("role-bot")

	// Configuration
	cfg := config.Config{}

	if err := cfg.Load(); err != nil {
		logger.Fatalf("failed to load configuration: %s", err)
	}

	// Discord
	discord, err := discordgo.New(fmt.Sprintf("Bot %s", cfg.DiscordAPIToken))
	if err != nil {
		logger.Fatalf("failed to create Discord client: %s", err)
	}

	logger.Debugf("discord=%s", discord)
}
