package discord

import (
	"github.com/bwmarrin/discordgo"
)

// The color used in Discord embeds to indicate something went wrong.
const EmbedErrorColor = 0xF44336

func NewEmbedResponse(embeds []*discordgo.MessageEmbed) *discordgo.InteractionResponse {
	return &discordgo.InteractionResponse{
		Type: discordgo.InteractionResponseChannelMessageWithSource,
		Data: &discordgo.InteractionResponseData{
			Embeds: embeds,
		},
	}
}
