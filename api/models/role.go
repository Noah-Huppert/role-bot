package models

import (
	"fmt"

	"github.com/jmoiron/sqlx"
)

// Discord role.
type Role struct {
	// Unique identifier, internal to this system.
	ID int

	// ID of role in Discord.
	ExternalID string

	// User facing name of role.
	Name string
}

// Storage operations for roles.
type RoleRepo interface {
	// Find a role in the database by its external ID.
	// Returns nil for the role if not found.
	GetByExternalID(externalID string) (*Role, error)
}

// Implements RoleRepo using Postgres.
type PGRoleRepo struct {
	// DB is the database connection.
	db *sqlx.DB
}

// NewPGRoleRepo creates a PGRoleRepo.
func NewPGRoleRepo(db *sqlx.DB) *PGRoleRepo {
	return &PGRoleRepo{
		db: db,
	}
}

func (r *PGRoleRepo) GetByExternalID(externalID string) (*Role, error) {
	res := r.db.QueryRowx("SELECT id, name FROM role WHERE external_id = ?", externalID)
	if res.Err() != nil {
		return nil, fmt.Errorf("failed to query database: %s", res.Err())
	}

	var role Role
	if err := res.Scan(&role); err != nil {
		return nil, fmt.Errorf("failed to parse database response: %s", err)
	}

	role.ExternalID = externalID
	return &role, nil
}
