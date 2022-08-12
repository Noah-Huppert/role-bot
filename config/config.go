package config

import (
	"github.com/caarlos0/env/v6"
)

// Holds application configuration.
type Config struct {
	// Discord API client ID.
	DiscordClientID string `env:"ROLE_BOT_DISCORD_CLIENT_ID"`

	// Discord API token.
	DiscordAPIToken string `env:"ROLE_BOT_DISCORD_API_TOKEN"`

	// Discord guild for which bot will serve commands.
	DiscordGuildID string `env:"ROLE_BOT_DISCORD_GUILD_ID"`
}

// Load configuration from environment.
func (c *Config) Load() error {
	return env.Parse(c)
}
