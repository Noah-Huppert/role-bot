package services

import "github.com/Noah-Huppert/role-bot/models"

// IRoleListSvc defines actions for role lists.
type IRoleListSvc interface {
	// CreateRoleList creates a role.
	CreateRoleList(opts CreateRoleListOpts) (*models.RoleList, UserError)
}

// CreateRoleListOpts are options for the role list that will be created.
type CreateRoleListOpts struct {
	// Name of new role list.
	Name string
}

// RoleListSvc implements the IRoleListSvc.
type RoleListSvc struct {
	// roleListRepo is the RoleList storage repository.
	roleListRepo models.RoleListRepo

	// roleCache is used to retrieve external roles.
	roleCache models.ExternalRoleCache
}

// NewRoleListSvcOpts are options for a new RoleListSvc.
type NewRoleListSvcOpts struct {
	// RoleListRepo used by service.
	RoleListRepo models.RoleListRepo

	// RoleCache used by service.
	RoleCache models.ExternalRoleCache
}

// NewRoleListSvc creates a new RoleListSvc.
func NewRoleListSvc(opts NewRoleListSvcOpts) RoleListSvc {
	return RoleListSvc{
		roleListRepo: opts.RoleListRepo,
		roleCache:    opts.RoleCache,
	}
}

func (svc RoleListSvc) CreateRoleList(opts CreateRoleListOpts) (*models.RoleList, UserError) {
	roleListInstance, err := svc.roleListRepo.Create(models.CreateRoleListOpts{
		Name: opts.Name,
	})
	if err != nil {
		return nil, NewUserError().
			ErrInternalError(err).
			UserError("Failed to create role list").
			Error()
	}

	roleList := roleListInstance.RoleList()

	return &roleList, nil
}
