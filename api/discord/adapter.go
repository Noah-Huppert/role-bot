package discord

import (
	"github.com/Noah-Huppert/golog"
	"github.com/bwmarrin/discordgo"

	"github.com/Noah-Huppert/role-bot/services"

	"fmt"
	"strings"
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

// flattenSubCmds walks a command's options to find all sub-commands.
func flattenSubCmds(opts []*discordgo.ApplicationCommandOption) []string {
	subCmds := []string{}

	for _, opt := range opts {
		if opt.Type == discordgo.ApplicationCommandOptionSubCommand {
			subCmds = append(subCmds, opt.Name)
		} else if opt.Type == discordgo.ApplicationCommandOptionSubCommandGroup {
			subSubCmds := flattenSubCmds(opt.Options)

			for _, subSubCmd := range subSubCmds {
				subCmds = append(subCmds, fmt.Sprintf("%s %s", opt.Name, subSubCmd))
			}
		}
	}

	return subCmds
}

// getFullCmdName walks a received interaction's options to get the full command name including sub-commands.
// The first argument, cmd, can be nil to allow for recursive calls. In this case the cmd.Name field is not added to the full command name.
func getFullCmdName(cmd *discordgo.ApplicationCommandInteractionData, opts []*discordgo.ApplicationCommandInteractionDataOption) string {
	subCmds := []string{}

	if cmd != nil {
		subCmds = append(subCmds, cmd.Name)
	}

	for _, opt := range opts {
		if opt.Type == discordgo.ApplicationCommandOptionSubCommand {
			subCmds = append(subCmds, opt.Name)
		} else if opt.Type == discordgo.ApplicationCommandOptionSubCommandGroup {
			subSubCmds := getFullCmdName(nil, opt.Options)

			if len(subSubCmds) > 0 {
				subCmds = append(subCmds, subSubCmds)
			}
		}
	}

	return strings.Join(subCmds, " ")
}

// Sets up commands and command handlers.
func (a *DiscordAdapter) Setup() error {
	// Add slash command handler
	a.discord.AddHandler(func(s *discordgo.Session, event *discordgo.InteractionCreate) {
		a.onInteractionCreate(event)
	})

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
		subCmds := flattenSubCmds(cmd.Options)

		createdCmdIDs[cmd.ID] = true

		if len(subCmds) > 0 {
			a.logger.Debugf("registered command '%s' with sub-command(s): %s", cmd.Name, strings.Join(subCmds, ", "))
		} else {
			a.logger.Debugf("registered command '%s'", cmd.Name)
		}
	}

	// Delete an old slash commands
	allCmds, err := a.discord.ApplicationCommands(a.cfg.ClientID, a.cfg.GuildID)
	if err != nil {
		return fmt.Errorf("failed to list all slash commands: %s", err)
	}

	for _, cmd := range allCmds {
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

// onInteractionCreate is called when a new Discord interaction is created by a user by interacting with the bot.
// Wrapper around logic which actually handles interaction. Instead this method performs error handling.
func (a *DiscordAdapter) onInteractionCreate(event *discordgo.InteractionCreate) {
	err := a.handleInteraction(event)
	if err != nil {
		a.discord.InteractionRespond(event.Interaction, &discordgo.InteractionResponse{
			Type: discordgo.InteractionResponseChannelMessageWithSource,
			Data: &discordgo.InteractionResponseData{
				Flags: uint64(discordgo.MessageFlagsEphemeral),
				Embeds: []*discordgo.MessageEmbed{
					UserErrorEmbed(err),
				},
			},
		})
		return
	}
}

// handleInteraction calls the appropriate handler based on the interaction.
func (a *DiscordAdapter) handleInteraction(interaction *discordgo.InteractionCreate) services.UserError {
	switch interaction.Type {
	case discordgo.InteractionApplicationCommand:
		// Find and call appropriate command handler
		cmd := interaction.ApplicationCommandData()
		cmdName := getFullCmdName(&cmd, cmd.Options)

		cmdHandlers := map[string]func(*discordgo.InteractionCreate, discordgo.ApplicationCommandInteractionData) services.UserError{
			"role-list create": a.handleRoleListCreate,
		}

		if handler, exists := cmdHandlers[cmdName]; exists {
			return handler(interaction, cmd)
		} else {
			return services.NewUserError().
				UserError("Unknown command").
				InternalError("unknown command '%s'", cmdName).
				Error()
		}

		break
	default:
		return services.NewUserError().
			UserError("Sorry, I don't know how to respond to this type of message").
			InternalError("unknown interaction type '%s'", interaction.Type).
			Error()
		break
	}

	return nil
}

func (a *DiscordAdapter) handleRoleListCreate(interaction *discordgo.InteractionCreate, cmd discordgo.ApplicationCommandInteractionData) services.UserError {
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
