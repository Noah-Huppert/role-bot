package discord

import (
	"fmt"

	"github.com/bwmarrin/discordgo"
)

// NewDiscordClient creates a Discord client.
func NewDiscordClient(apiToken string) (*NewDiscordClientRes, error) {
	discord, err := discordgo.New(fmt.Sprintf("Bot %s", apiToken))
	if err != nil {
		return nil, fmt.Errorf("failed to initialize Discord client: %s", err)
	}

	discordReady := make(chan int)

	discord.AddHandler(func(s *discordgo.Session, r *discordgo.Ready) {
		discordReady <- 0
	})

	if err := discord.Open(); err != nil {
		return nil, fmt.Errorf("failed to connect Discord client: %s", err)
	}

	return &NewDiscordClientRes{
		Discord: discord,
		Ready:   discordReady,
	}, nil
}

// NewDiscordClientRes includes a newly created Discord client and channel to determine when the Discord client is connected.
type NewDiscordClientRes struct {
	// Discord client.
	Discord *discordgo.Session

	// ReadyChan is a channel which receives a message when the Discord client is connected successfully.
	Ready <-chan int
}
