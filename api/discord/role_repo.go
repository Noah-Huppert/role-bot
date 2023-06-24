package discord

import (
	"fmt"

	"github.com/Noah-Huppert/role-bot/models"
	"github.com/bwmarrin/discordgo"
)

// DiscordRoleRepo is a models.ExternalRoleRepo which queries the Discord API.
type DiscordRoleRepo struct {
	// Discord API client.
	discord *discordgo.Session

	// GuildID is the ID of the Discord server in which to store and query roles.
	guildID string
}

// NewDiscordRoleRepo creates a new DiscordRoleRepo.
func NewDiscordRoleRepo(opts NewDiscordRoleRepoOpts) *DiscordRoleRepo {
	return &DiscordRoleRepo{
		discord: opts.Discord,
		guildID: opts.GuildID,
	}
}

// NewDiscordRoleRepoOpts are options to create a new DiscordRoleRepo.
type NewDiscordRoleRepoOpts struct {
	// Discord API client.
	Discord *discordgo.Session

	// GuildID in which roles will be created and retrieved.
	GuildID string
}

// Create makes a new role in a Discord server.
func (r *DiscordRoleRepo) Create(opts models.CreateExternalRoleOpts) (*models.ExternalRole, error) {
	// Create empty role
	externalRole, err := r.discord.GuildRoleCreate(r.guildID)
	if err != nil {
		return nil, fmt.Errorf("failed to create empty new role: %s", err)
	}

	// Edit to our liking
	_, err = r.discord.GuildRoleEdit(r.guildID, externalRole.ID, opts.Name, externalRole.Color, externalRole.Hoist, externalRole.Permissions, externalRole.Mentionable)
	if err != nil {
		return nil, fmt.Errorf("failed to set fields on new role as specified: %s", err)
	}

	return &models.ExternalRole{
		ExternalID: externalRole.ID,
		Name:       opts.Name,
	}, nil
}

// GetByExternalID finds a role based on its DiscordID.
func (r *DiscordRoleRepo) GetByExternalID(externalID string) (*models.ExternalRole, error) {
	role, err := r.discord.State.Role(r.guildID, externalID)
	if err != nil {
		return nil, fmt.Errorf("failed to get role from Discord: %s", err)
	}

	if role == nil {
		return nil, nil
	}

	return &models.ExternalRole{
		ExternalID: externalID,
		Name:       role.Name,
	}, nil
}
