package models

import (
	"fmt"

	"github.com/jmoiron/sqlx"
)

// Group of similar roles categorized into a list.
type RoleList struct {
	// Unique identifier.
	ID int

	// User friendly name for the list.
	Name string
}

// Store and retrieve role lists.
type RoleListRepo interface {
	// Save a new role list.
	Create(opts CreateRoleListOpts) (*RoleListInstanceRepo, error)
}

// Options for the RoleListRepo.Create operation.
type CreateRoleListOpts struct {
	// RoleList.Name of the new RoleList.
	Name string
}

// Storage operations for a single instance of a role list.
type RoleListInstanceRepo interface {
	// List roles in role list.
	ListRoles() ([]Role, error)
}

// Implements RoleListRepo using Postgres.
type PGRoleListRepo struct {
	// DB is the database connection.
	db *sqlx.DB
}

// Create a new PGRoleListRepo, connects to the database.
func NewPGRoleListRepo(db *sqlx.DB) *PGRoleListRepo {
	return &PGRoleListRepo{
		db: db,
	}
}

func (r *PGRoleListRepo) Create(opts CreateRoleListOpts) (RoleListInstanceRepo, error) {
	res := r.db.QueryRowx("INSERT INTO role_list (name) VALUES (?) RETURNING id", opts.Name)
	if res.Err() != nil {
		return nil, fmt.Errorf("failed to run insert SQL statement: %s", res.Err())
	}

	var insertedID int
	if err := res.Scan(&insertedID); err != nil {
		return nil, fmt.Errorf("failed to retrieve inserted ID: %s", err)
	}

	return NewPGRoleListInstanceRepo(r.db, insertedID), nil
}

// Implements RoleListInstanceRepo using Postgres.
type PGRoleListInstanceRepo struct {
	// Database connection.
	db *sqlx.DB

	// ID of role list for which operations will take place.
	roleListID int
}

// Creates a new PGRoleListInstanceRepo instance.
func NewPGRoleListInstanceRepo(db *sqlx.DB, roleListID int) *PGRoleListInstanceRepo {
	return &PGRoleListInstanceRepo{
		db:         db,
		roleListID: roleListID,
	}
}

func (r *PGRoleListInstanceRepo) ListRoles() ([]Role, error) {
	res := r.db.QueryRowx("SELECT id, external_id, name FROM role_list_role WHERE role_list_id = ?", r.roleListID)
	if res.Err() != nil {
		return []Role{}, fmt.Errorf("failed to query database: %s", res.Err())
	}

	var roles []Role
	if err := res.Scan(&roles); err != nil {
		return []Role{}, fmt.Errorf("failed to decode database response: %s", err)
	}

	return roles, nil
}
