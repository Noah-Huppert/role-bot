package discord

import (
	"github.com/Noah-Huppert/golog"
	"github.com/bwmarrin/discordgo"

	"github.com/Noah-Huppert/role-bot/models"

	"fmt"
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

	// RoleCache stores and retrieves roles while caching them within the system.
	roleCache models.ExternalRoleCache

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
		logger: opts.Logger,
		cfg:    opts.Cfg,
		repos:  opts.Repos,
		roleCache: models.NewExternalRoleCache(models.NewExternalRoleCacheOpts{
			Cache: opts.Repos.Role,
			External: NewDiscordRoleRepo(NewDiscordRoleRepoOpts{
				Discord: discord,
				GuildID: opts.Cfg.GuildID,
			}),
		}),
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
