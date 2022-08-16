package discord

import (
	"github.com/Noah-Huppert/golog"
	"github.com/bwmarrin/discordgo"

	"github.com/Noah-Huppert/role-bot/models"

	"fmt"
	"strings"
)

// Name of the tag used to map struct fields to Discord slash command option names.
var ScanInteractionNameTag = "discord"

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

// DiscordAdapter creation options.
type DiscordAdapterOpts struct {
	// See DiscordAdapter.logger.
	Logger golog.Logger

	// See DiscordAdapter.cfg.
	Cfg DiscordConfig

	// See DiscordAdapter.Repos.
	Repos models.Repos
}

// Interfaces with Discord to invoke bot logic.
type DiscordAdapter struct {
	// Logger.
	logger golog.Logger

	// Discord configuration.
	cfg DiscordConfig

	// Model repositories.
	repos models.Repos

	// Discord API client.
	discord *discordgo.Session
}

// Creates a new DiscordAdapter.
func NewDiscordAdapter(opts DiscordAdapterOpts) (*DiscordAdapter, error) {
	discord, err := discordgo.New(fmt.Sprintf("Bot %s", opts.Cfg.APIToken))
	if err != nil {
		return nil, fmt.Errorf("failed to initialize Discord client: %s", err)
	}

	return &DiscordAdapter{
		logger:  opts.Logger,
		cfg:     opts.Cfg,
		repos:   opts.Repos,
		discord: discord,
	}, nil
}

// Indicates an error occurred which should be sent to the user.
type UserError struct {
	// Any internal error which should not be shown to the user.
	InternalError string

	// The user firendly error which should be sent to the user.
	UserError string
}

// Implements the error interface for the UserError. This will return the non user friendly error.
func (e UserError) Error() string {
	return e.InternalError
}

func (e UserError) Embed() *discordgo.MessageEmbed {
	return &discordgo.MessageEmbed{
		Title:       "Error",
		Description: e.UserError,
		Color:       EmbedErrorColor,
	}
}

// Transforms a list of command options into a map where keys are the option's .Name field. Recursive.
// func cmdOptsToMap(opts []*discordgo.ApplicationCommandOption) map[string]*discordgo.ApplicationCommandOption {
// 	out := map[string]*discordgo.ApplicationCommandOption{}

//   for _, opt := range opts {
//     out[opt.Name] = opt
//   }

//   return out
// }

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

	// De-register all existing commands
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

	// Register commands
	errs = []string{}

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
					Options: []*discordgo.ApplicationCommandOption{
						{
							Type:        discordgo.ApplicationCommandOptionString,
							Name:        "name",
							Description: "What the role list should be called",
							Required:    true,
						},
					},
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
	var handleFn func(golog.Logger, *discordgo.InteractionCreate) error = nil

	switch slashCmdName {
	case mkSubCmdName(RoleListGroup, RoleListCreate):
		handleFn = a.onCmdRoleListCreate
		break
	}

	// Run handler
	if handleFn != nil {
		a.logger.Debugf("new slash command interaction \"%s\"", slashCmdName)

		if err := handleFn(a.logger.GetChild(slashCmdName), interaction); err != nil {
			if err, ok := err.(UserError); ok {
				a.discord.InteractionRespond(
					interaction.Interaction,
					NewEmbedResponse([]*discordgo.MessageEmbed{
						err.Embed(),
					}))
			}
			a.logger.Errorf("failed to handle interaction create for slash command \"%s\": %s", slashCmdName, err)
			return
		}
	} else {
		a.logger.Warnf("received new slash command interaction for command bot does not know about: %s", slashCmdName)
	}
}

// Run when a new role list create command is received.
func (a *DiscordAdapter) onCmdRoleListCreate(logger golog.Logger, interaction *discordgo.InteractionCreate) error {
	// Parse options
	opts := cmdRoleListCreateOpts{}
	if err := ScanInteractionOpts(interaction, &opts); err != nil {
		return fmt.Errorf("failed to scan interaction options: %s", err)
	}

	// Save role list
	// roleList, err := a.repos.RoleList.Create(models.CreateRoleListOpts{
	// 	Name: opts.Name,
	// })
	// if err != nil {
	//   return
	// }

	return UserError{
		InternalError: "oops",
		UserError:     "Hey whats up?",
	}
}

type cmdRoleListCreateOpts struct {
	Name string `discord:"name"`
}

// Cleanup Discord adapter.
func (a *DiscordAdapter) Cleanup() error {
	// Close websocket
	if err := a.discord.Close(); err != nil {
		return fmt.Errorf("failed to cleanup Discord client: %s", err)
	}

	return nil
}
