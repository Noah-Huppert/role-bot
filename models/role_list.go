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
	Create(opts CreateRoleListOpts) (*RoleList, error)
}

// Options for the RoleListRepo.Create operation.
type CreateRoleListOpts struct {
	// RoleList.Name of the new RoleList.
	Name string
}

// Implements RoleListRepo using Postgres.
type PGRoleListRepo struct {
	// Database connection.
	db *sqlx.DB
}

// Create a new PGRoleListRepo, connects to the database.
func NewPGRoleListRepo(db *sqlx.DB) *PGRoleListRepo {
	return &PGRoleListRepo{
		db: db,
	}
}

func (r *PGRoleListRepo) Create(opts CreateRoleListOpts) (*RoleList, error) {
	res := r.db.QueryRowx("INSERT INTO role_list (name) VALUES (?) RETURNING id", opts.Name)
	if res.Err() != nil {
		return nil, fmt.Errorf("failed to run insert SQL statement: %s", res.Err())
	}

	var insertedID int
	if err := res.Scan(&insertedID); err != nil {
		return nil, fmt.Errorf("failed to retrieve inserted ID: %s", err)
	}

	return &RoleList{
		ID:   insertedID,
		Name: opts.Name,
	}, nil
}
