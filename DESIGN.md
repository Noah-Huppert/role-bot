# Design
Outlines goals for how the role bot should be made.

# Table Of Contents
- [Functional Requirements](#functional-requirements)
- [User Experience](#user-experience)

# Functional Requirements
- Add and remove a set of Discord roles as a non-admin
- Discover existing roles
- Create new roles as an admin
- Delete roles as an admin
- Edit existing roles as an admin

# User Experience
Role are categorized into lists which group related roles (ex., game roles vs location roles).

A message for each role list could be placed in a server's welcome channel. A reaction list style message will not be used due to the 50 reaction limit. Instead a message with a list of roles and their associated emojis will be display. Along with a button the user can click to trigger a more graphical role assignment process:

> ### Game Roles
> Assign roles to tell people what games you are interested in:
>
> 🏴‍☠️ Sea Of Thieves  
> 🏎️ Rocket League  
> ⚽ FIFA  
> 🏀 2K  
>   
> [ Assign Roles ]

When clicked a message which can only be seen by the interacting user would be sent which shows a select menu of all the possible roles with their emojis. Once the user has selected / deselected the roles they wish a button can be clicked to complete the role assignment.

> ### Game Roles
> Select or deselect the roles you wish to have assigned to your user:  
>   
> | Role Select Menu |  
>  
> [ Save Roles ]

Once the user has clicked the save button the message will either: disappear or show a success message.

The intro text of the initial role list message can be configured. This list message will also be updated as new roles get added and deleted.

Additional admin commands are made available:

- `/role-list create <name>`
- `/role-list edit <role list>`
  - This will show a text modal which allows the list to be renamed
- `/role-list delete <role list>`
  - This will also delete any assign messages
- `/role-list send-assign-message <channel> [description text]`
  - Only one role assignment message per channel is allowed.
- `/role-list edit-assign-message <role list> <channel> <description text>`
- `/role-list delete-assign-message <role list> <channel>`
- `/role-list add-role <role list> <emoji> <name>`
  - `<name>` must be an existing role
- `/role-list create-role <role list> <emoji> <name>`
  - Creates a Discord role and adds it to the role list
- `/role-list remove-role <role list> <name>`
- `/role-list edit-role <role list> <name>`
  - This will send a message only visible to the interacting user
  - Will show a Discord text field component modal with a field for the emoji and a field for the role name

Users can also assign roles using slash commands:

- `/role assign <role> [user]`
- `/role unassign <role> [user]`

These commands only allow assigning to users other than yourself if you are an admin.

The `<role>` and `<role list>` arguments will auto-complete.  
Admins will be identified by an admin role specified in the bot configuration.


