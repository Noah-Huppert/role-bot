package discord

import (
	"github.com/Noah-Huppert/golog"
	"github.com/bwmarrin/discordgo"

	"fmt"
	"strings"
)

// Configures Discord.
type DiscordConfig struct {
	// Discord API client ID.
	ClientID string

	// Discord API token.
	APIToken string

	// ID of guild for which server is run.
	GuildID string
}

// Names of slash commands.
const (
	RoleListGroup               = "role-list"
	RoleListCreate              = "create"
	RoleListEdit                = "edit"
	RoleListDelete              = "delete"
	RoleListSendAssignMessage   = "send-assign-message"
	RoleListEditAssignMessage   = "edit-assign-message"
	RoleListDeleteAssignMessage = "delete-assign-message"
	RoleListAddRole             = "add-role"
	RoleListCreateRole          = "create-role"
	RoleListRemoveRole          = "remove-role"
	RoleListEditRole            = "edit-role"

	RoleGroup    = "role"
	RoleAssign   = "assign"
	RoleUnassign = "unassign"
)

// Combine a slash command group and sub-command name into a full slash command name.
func mkSubCmdName(group string, cmd string) string {
	return fmt.Sprintf("%s %s", group, cmd)
}

// Interfaces with Discord to invoke bot logic.
type DiscordAdapter struct {
	// Logger.
	logger golog.Logger

	// Discord configuration.
	cfg DiscordConfig

	// Discord API client.
	discord *discordgo.Session
}

// Creates a new DiscordAdapter.
func NewDiscordAdapter(logger golog.Logger, cfg DiscordConfig) (*DiscordAdapter, error) {
	discord, err := discordgo.New(fmt.Sprintf("Bot %s", cfg.APIToken))
	if err != nil {
		return nil, fmt.Errorf("failed to initialize Discord client: %s", err)
	}

	return &DiscordAdapter{
		logger:  logger,
		cfg:     cfg,
		discord: discord,
	}, nil
}

// Sets up commands and command handlers.
func (a *DiscordAdapter) Setup() error {
	// Connect client
	discordReady := make(chan int)

	a.discord.AddHandler(func(s *discordgo.Session, r *discordgo.Ready) {
		discordReady <- 0
	})

	if err := a.discord.Open(); err != nil {
		return fmt.Errorf("failed to connect Discord client: %s", err)
	}

	<-discordReady

	// Register commands
	var errs []string = []string{}

	for _, cmd := range a.commandDefinitions() {
		_, err := a.discord.ApplicationCommandCreate(a.discord.State.User.ID, a.cfg.GuildID, cmd)
		if err != nil {
			errs = append(errs, fmt.Sprintf("failed to register command \"%s\": %s", cmd.Name, err))
		}
	}

	a.discord.AddHandler(a.onInteractionCreate)

	// Handle errors
	if len(errs) > 0 {
		return fmt.Errorf("failed to register commands:\n%s", strings.Join(errs[:], "\n"))
	}

	a.logger.Info("Registered slash commands")
	return nil
}

// Returns a list of Discord slash command definitions.
func (a *DiscordAdapter) commandDefinitions() []*discordgo.ApplicationCommand {
	return []*discordgo.ApplicationCommand{
		{
			Name:        RoleListGroup,
			Description: "Role list management commands",
			Options: []*discordgo.ApplicationCommandOption{
				{
					Type:        discordgo.ApplicationCommandOptionSubCommand,
					Name:        RoleListCreate,
					Description: "Create a new role list",
				},
			},
		},
	}
	/*
			{
				Name:        RoleListEdit,
				Description: "Edit a role list and allow it to be renamed",
			},
			{
				Name:        RoleListDelete,
				Description: "Delete a role list and any associated assign messages",
			},
			{
				Name:        RoleListSendAssignMessage,
				Description: "Send a role assignment message for the role list to a channel",
			},
			{
				Name:        RoleListEditAssignMessage,
				Description: "Edit a role assignment message for the role list in a channel",
			},
			{
				Name:        RoleListDeleteAssignMessage,
				Description: "Delete a role assignment message for a role list in a channel",
			},
			{
				Name:        RoleListAddRole,
				Description: "Add an existing role to a role list",
			},
			{
				Name:        RoleListCreateRole,
				Description: "Create a new role in the Discord server and add it to a role list",
			},
			{
				Name:        RoleListRemoveRole,
				Description: "Remove a role from a role list",
			},
			{
				Name:        RoleListEditRole,
				Description: "Edit a role entry in a role list",
			},
			{
				Name:        RoleAssign,
				Description: "Assign a role to a user",
			},
			{
				Name:        RoleUnassign,
				Description: "Unassign a role from a user",
			},
		}
	*/
}

// Handles a Discord interaction creation event.
func (a *DiscordAdapter) onInteractionCreate(_ *discordgo.Session, interaction *discordgo.InteractionCreate) {
	// Determine slash command's name
	var slashCmdData = interaction.ApplicationCommandData()
	var slashCmdSubCmd = ""

	for _, opt := range slashCmdData.Options {
		if opt.Type == discordgo.ApplicationCommandOptionSubCommand {
			slashCmdSubCmd = opt.Name
		}
	}

	var slashCmdName = slashCmdData.Name
	if len(slashCmdSubCmd) > 0 {
		slashCmdName = mkSubCmdName(slashCmdName, slashCmdSubCmd)
	}

	// Determine which handler to use
	var handleFn func(*discordgo.InteractionCreate) error = nil

	switch slashCmdName {
	case mkSubCmdName(RoleListGroup, RoleListCreate):
		handleFn = a.onCmdRoleListCreate
		break
	}

	// Run handler
	if handleFn != nil {
		a.logger.Debugf("new slash command interaction \"%s\"", slashCmdName)

		if err := handleFn(interaction); err != nil {
			a.logger.Errorf("failed to handle interaction create for slash command \"%s\": %s", slashCmdData.Name, err)
			return
		}
	} else {
		a.logger.Warnf("received new slash command interaction for command bot does not know about: %s", slashCmdName)
	}
}

// Run when a new role list create command is received.
func (a *DiscordAdapter) onCmdRoleListCreate(interaction *discordgo.InteractionCreate) error {
	return nil
}

// Cleanup Discord adapter.
func (a *DiscordAdapter) Cleanup() error {
	// De-register commands
	var errs []string = []string{}

	cmds, err := a.discord.ApplicationCommands(a.discord.State.User.ID, a.cfg.GuildID)
	if err != nil {
		return fmt.Errorf("failed to get list of registered slash commands: %s", err)
	}

	for _, cmd := range cmds {
		err := a.discord.ApplicationCommandDelete(a.discord.State.User.ID, a.cfg.GuildID, cmd.ID)
		if err != nil {
			errs = append(errs, fmt.Sprintf("failed to deregister slash command \"%s\": %s", cmd.Name, err))
		}
	}

	if len(errs) > 0 {
		return fmt.Errorf("failed to deregister commands:\n%s", strings.Join(errs[:], "\n"))
	}

	// Close websocket
	if err := a.discord.Close(); err != nil {
		return fmt.Errorf("failed to cleanup Discord client: %s", err)
	}

	return nil
}
