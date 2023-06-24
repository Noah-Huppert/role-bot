package models

// Holds all model repositories.
type Repos struct {
	// RoleList repository.
	RoleList RoleListRepo

	// RoleCache is the role cache.
	RoleCache ExternalRoleCache
}
