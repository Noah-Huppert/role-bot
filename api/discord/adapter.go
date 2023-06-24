package discord

import (
	"github.com/Noah-Huppert/golog"
	"github.com/bwmarrin/discordgo"

	"github.com/Noah-Huppert/role-bot/services"

	"fmt"
)

// Configures Discord.
type DiscordConfig struct {
	// Discord API client ID.
	ClientID string

	// ID of guild for which server is run.
	GuildID string
}

// Interfaces with Discord to invoke bot logic.
type DiscordAdapter struct {
	// Logger.
	logger golog.Logger

	// Discord configuration.
	cfg DiscordConfig

	// svcs is a collection of services.
	svcs services.Services

	// Discord API client.
	discord *discordgo.Session
}

// Creates a new DiscordAdapter.
func NewDiscordAdapter(opts DiscordAdapterOpts) *DiscordAdapter {
	return &DiscordAdapter{
		logger:  opts.Logger,
		cfg:     opts.Cfg,
		svcs:    opts.Svcs,
		discord: opts.Discord,
	}
}

// DiscordAdapter creation options.
type DiscordAdapterOpts struct {
	// Logger used by DiscordAdapter.
	Logger golog.Logger

	// Cfg is the DiscordAdapter configuration.
	Cfg DiscordConfig

	// Svcs are services used by DiscordAdapter.
	Svcs services.Services

	// Discord client.
	Discord *discordgo.Session
}

// UserErrorEmbed creates a Discord embed from a user error.
func UserErrorEmbed(e services.UserError) *discordgo.MessageEmbed {
	return &discordgo.MessageEmbed{
		Title:       "Error",
		Description: e.UserError(),
		Color:       EmbedErrorColor,
	}
}

// Sets up commands and command handlers.
func (a *DiscordAdapter) Setup() error {
	// Register slash commands
	cmds, err := a.discord.ApplicationCommandBulkOverwrite(a.cfg.ClientID, a.cfg.GuildID, []*discordgo.ApplicationCommand{
		{
			Name:        "role-list create",
			Description: "Create new role list",
			Options: []*discordgo.ApplicationCommandOption{
				{
					Name:     "name",
					Type:     discordgo.ApplicationCommandOptionString,
					Required: true,
				},
			},
		},
	})
	if err != nil {
		return fmt.Errorf("failed to register slash commands: %s", err)
	}
	for _, cmd := range cmds {
		a.logger.Debugf("registered command %s", cmd.Name)
	}

	a.logger.Info("setup complete")

	return nil
}

// Cleanup Discord adapter.
func (a *DiscordAdapter) Cleanup() error {
	// Close websocket
	if err := a.discord.Close(); err != nil {
		return fmt.Errorf("failed to cleanup Discord client: %s", err)
	}

	return nil
}
