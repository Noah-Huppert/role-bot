package discord

import (
	"fmt"

	"github.com/Noah-Huppert/role-bot/models"
	"github.com/bwmarrin/discordgo"
)

// Queries the Discord API for RoleRepo operations.
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
// ExternalID cannot be set when calling this method, as we do not get to pick the external ID, discord does. Instead determine ExternalID from return value.
// The return value's ID field will not be set.
func (r *DiscordRoleRepo) Create(opts models.CreateRoleOpts) (*models.Role, error) {
	if opts.ExternalID != "" {
		return nil, fmt.Errorf("the ExternalID opt cannot be set as we cannot pick the new role's external ID, discord's API provides us with an external ID")
	}

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

	return &models.Role{
		ID:         0,
		ExternalID: externalRole.ID,
		Name:       opts.Name,
	}, nil
}

// GetByExternalID finds a role based on its DiscordID.
// The return value's ID field will not be set.
func (r *DiscordRoleRepo) GetByExternalID(externalID string) (*models.Role, error) {
	role, err := r.discord.State.Role(r.guildID, externalID)
	if err != nil {
		return nil, fmt.Errorf("failed to get role from Discord: %s", err)
	}

	if role == nil {
		return nil, nil
	}

	return &models.Role{
		ID:         0,
		ExternalID: externalID,
		Name:       role.Name,
	}, nil
}
