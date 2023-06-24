package models

import (
	"fmt"

	"github.com/jmoiron/sqlx"
)

// Role as stored by role bot.
type Role struct {
	// ID is the Unique identifier of this role, internal to this system.
	ID int

	// ExternalID is the ID of role in external service.
	ExternalID string

	// Name is the user facing name of role in service.
	Name string
}

// Information about role which is entirely external and uncontrolled by role bot.
type ExternalRole struct {
	// ID of role in external service.
	ExternalID string

	// User facing name of role in service.
	Name string
}

type ExternalRoleRepo interface {
	// Create a new role with the external service.
	Create(opts CreateExternalRoleOpts) (*ExternalRole, error)

	// GetByExternalID retrieves an external role by its external ID.
	// Returns nil for the role if not found.
	GetByExternalID(externalID string) (*ExternalRole, error)
}

// CreateExternalRoleOpts are the options for a new external role.
// The ExternalID of a new role cannot be specified because the external service is the one which assigns this ID.
type CreateExternalRoleOpts struct {
	// User facing name of external role
	Name string
}

// Storage operations for roles.
type RoleRepo interface {
	// Create a new role.
	Create(opts CreateRoleOpts) (*Role, error)

	// Find a role in the database by its external ID.
	// Returns nil for the role if not found.
	GetByExternalID(externalID string) (*Role, error)
}

type CreateRoleOpts struct {
	// ExternalID of new role.
	ExternalID string

	// Name field of new role.
	Name string
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

func (r *PGRoleRepo) Create(opts CreateRoleOpts) (*Role, error) {
	res := r.db.QueryRowx("INSERT INTO role (external_id, name) VALUES (?, ?) RETURNING ID", opts.ExternalID, opts.Name)
	if res.Err() != nil {
		return nil, fmt.Errorf("failed to insert new role in database: %s", res.Err())
	}

	var id int
	if err := res.Scan(&id); err != nil {
		return nil, fmt.Errorf("error reading inserted role's ID: %s", err)
	}

	return &Role{
		ID:         id,
		ExternalID: opts.ExternalID,
		Name:       opts.Name,
	}, nil
}

func (r *PGRoleRepo) GetByExternalID(externalID string) (*Role, error) {
	res := r.db.QueryRowx("SELECT id, external_id, name FROM role WHERE external_id = ?", externalID)
	if res.Err() != nil {
		return nil, fmt.Errorf("failed to query database: %s", res.Err())
	}

	var role Role
	if err := res.Scan(&role); err != nil {
		return nil, fmt.Errorf("failed to parse database response: %s", err)
	}

	return &role, nil
}

// ExternalRoleCache is a RoleRepo which searches in a cache for roles. If a role is not in the cache then it uses an external service to try and resolve the role. Caching the new role if it is found.
type ExternalRoleCache struct {
	// Cache is the repo in which cached roles are stored.
	cache RoleRepo

	// External is the service which roles are looked up in if they aren't found in the cache.
	external ExternalRoleRepo
}

// NewExternalRoleCache creates a new ExternalRoleCache.
func NewExternalRoleCache(opts NewExternalRoleCacheOpts) ExternalRoleCache {
	return ExternalRoleCache{
		cache:    opts.Cache,
		external: opts.External,
	}
}

// NewExternalRoleCacheOpts are options for creating a new ExternalRoleCache
type NewExternalRoleCacheOpts struct {
	// Cache is the RoleRepo used to store cache data.
	Cache RoleRepo

	// External is the RoleRepo used to query an external service for cache misses.
	External ExternalRoleRepo
}

// Create the new role in the external service and then save in the cache.
func (c *ExternalRoleCache) Create(opts CreateExternalRoleOpts) (*Role, error) {
	// Create in external service
	externalRole, err := c.external.Create(opts)
	if err != nil {
		return nil, fmt.Errorf("failed to create new role via external service: %s", err)
	}

	// Save in cache
	cacheOpts := CreateRoleOpts{
		ExternalID: externalRole.ExternalID,
		Name:       opts.Name,
	}
	role, err := c.cache.Create(cacheOpts)
	if err != nil {
		return nil, fmt.Errorf("failed to save new role in cache: %s", err)
	}

	return role, nil
}

// GetByExternalID looks in the cache for a role. If it doesn't exist in the cache the role is retrieved from an external service. If the role is not found in that service then nil is returned.
func (c *ExternalRoleCache) GetByExternalID(externalID string) (*Role, error) {
	// Check cache for role
	cachedRole, err := c.cache.GetByExternalID(externalID)
	if err != nil {
		return nil, fmt.Errorf("failed to look role up in cache storage: %s", err)
	}

	if cachedRole != nil {
		return cachedRole, nil
	}

	// If role not found in cache check external service
	externalRole, err := c.external.GetByExternalID(externalID)
	if err != nil {
		return nil, fmt.Errorf("failed to lookup role in external service: %s", err)
	}

	if externalRole == nil {
		// Not found in external service
		return nil, nil
	}

	// If external role found, save in cache
	savedRole, err := c.cache.Create(CreateRoleOpts{
		ExternalID: externalRole.ExternalID,
		Name:       externalRole.Name,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to save retrieved role from external service in cache: %s", err)
	}
	return savedRole, nil
}
