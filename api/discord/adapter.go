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

/* // FlattenCmdIDs takes a list of commands and their sub-commands and returns a map where keys are command and sub-command IDs and value are
func FlattenCmdIDs(cmds []*discordgo.ApplicationCommand) map[string]bool {
	var ids = map[string]bool{}

	for _, cmd := range cmds {
		ids[cmd.ID] = true

		for _, opt := range cmd.Options {

		}
	}
} */

// Sets up commands and command handlers.
func (a *DiscordAdapter) Setup() error {
	// Register slash commands
	createdCmds, err := a.discord.ApplicationCommandBulkOverwrite(a.cfg.ClientID, a.cfg.GuildID, []*discordgo.ApplicationCommand{
		{
			Type:        discordgo.ChatApplicationCommand,
			Name:        "role-list",
			Description: "Role list commands",
			Options: []*discordgo.ApplicationCommandOption{
				{
					Type:        discordgo.ApplicationCommandOptionSubCommand,
					Name:        "create",
					Description: "Create new role list",
					Options: []*discordgo.ApplicationCommandOption{
						{
							Type:        discordgo.ApplicationCommandOptionString,
							Name:        "name",
							Description: "Name of new role list",
							Required:    true,
						},
					},
				},
			},
		},
	})
	if err != nil {
		return fmt.Errorf("failed to register slash commands: %s", err)
	}
	var createdCmdIDs = map[string]bool{}

	for _, cmd := range createdCmds {
		a.logger.Debugf("registered command %s (%s)", cmd.Name, cmd.ID)
		createdCmdIDs[cmd.ID] = true
	}

	// Delete an old slash commands
	allCmds, err := a.discord.ApplicationCommands(a.cfg.ClientID, a.cfg.GuildID)
	if err != nil {
		return fmt.Errorf("failed to list all slash commands: %s", err)
	}

	for _, cmd := range allCmds {
		a.logger.Debugf("allCmd name=%s, id=%s", cmd.Name, cmd.ID)

		if _, desiredCmd := createdCmdIDs[cmd.ID]; !desiredCmd {
			if err := a.discord.ApplicationCommandDelete(a.cfg.ClientID, a.cfg.GuildID, cmd.ID); err != nil {
				return fmt.Errorf("failed to delete old slash command named '%s': %s", cmd.Name, err)
			} else {
				a.logger.Debugf("deleted old command %s", cmd.Name)
			}
		}
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
