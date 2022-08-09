# Design
Outlines goals for how the role bot should be made.

# Table Of Contents
- [Functional Requirements](#functional-requirements)
- [User Experience](#user-experience)

# Functional Requirements
- Add and remove a set of Discord roles as a non-admin
- Discover existing roles
- Create new roles as an admin

# User Experience
Discord slash commands will be used to invoke the bot.

- `/role assign <role> [user]`
- `/role unassign <role> [user]`

These commands only allow assigning to users other than yourself if you are an admin.

Additionally a message which could be placed in a server's welcome channel should be supported by the bot. A reaction list style message will not be used due to the 50 reaction limit. Instead a message with a list of roles and their associated emojis will be display. Along with a button the user can click to trigger a more graphical role assignment process:

> Assign roles to tell people what games you are interested in:
>
> 🏴‍☠️ Sea Of Thieves
> 🏎️ Rocket League
> ⚽ FIFA
> 🏀 2K
> 
> [ Assign Roles ]

When clicked a message which can only be seen by the interacting user would be sent which shows a select menu of all the possible roles with their emojis. Once the user has selected / deselected the roles they wish a button can be clicked to complete the role assignment.

> Select or deselect the roles you wish to have assigned to your user:
> 
> | Role Select Menu |
>
> [ Save Roles ]

Once the user has clicked the save button the message will either: disappear, show a success message, or remain. 

The intro text of the initial role list message can be configured. This list message will also be updated as new roles get added and deleted.

Additional admin commands are made available:

- `/role send-assign-message <channel>`
  - Only one role assignment message per channel is allowed.
- `/role delete-assign-message <channel>`
- `/role add <emoji> <name>`
- `/role remove <name>`
