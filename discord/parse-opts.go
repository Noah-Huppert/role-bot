package discord

import (
	"github.com/bwmarrin/discordgo"

	"fmt"
	"reflect"
	"strings"
)

// Name of the tag used to map struct fields to Discord slash command option names.
var ScanInteractionNameTag = "discord"

// Given a slash command invocation maps option values into a struct. An error will occur if an option doesn't exist as a struct field. Not all Discord option types are supported, the types not supported are: User, Channel, role, MentionableRole, and Attachement.
func ScanInteractionOpts(interaction *discordgo.InteractionCreate, opts interface{}) error {
	// Organize options by name
	optsMap := map[string]*discordgo.ApplicationCommandInteractionDataOption{}
	scannedFields := map[string]bool{}

	// Get options, if sub-command get sub-command options
	interactionData := interaction.ApplicationCommandData()
	options := interactionData.Options

	for _, opt := range options {
		if opt.Type == discordgo.ApplicationCommandOptionSubCommand {
			options = opt.Options
			break
		}
	}

	for _, opt := range options {
		optsMap[opt.Name] = opt
		scannedFields[opt.Name] = false
	}

	// Scan struct
	val := reflect.ValueOf(opts).Elem()
	if val.Kind() != reflect.Struct {
		return fmt.Errorf("can only scan struct types, was: %s", val.Kind())
	}

	errs := []string{}

	for i := 0; i < val.Type().NumField(); i++ {
		field := val.Type().Field(i)
		fieldName := field.Name

		if tag := field.Tag.Get(ScanInteractionNameTag); len(tag) > 0 {
			fieldName = tag
		}

		// Check option with this name exists
		if _, optExists := optsMap[fieldName]; !optExists {
			continue
		}

		opt := optsMap[fieldName]
		scannedFields[fieldName] = true

		// Check types match
		structFieldType := field.Type.Kind().String()
		optType := fmt.Sprintf("<unsupported Discord type %s>", opt.Type.String())

		switch opt.Type {
		case discordgo.ApplicationCommandOptionString:
			optType = reflect.String.String()
		case discordgo.ApplicationCommandOptionInteger:
			optType = reflect.Int.String()
		case discordgo.ApplicationCommandOptionBoolean:
			optType = reflect.Bool.String()
		case discordgo.ApplicationCommandOptionNumber:
			optType = reflect.Float64.String()
		}

		if structFieldType != optType {
			errs = append(errs, fmt.Sprintf("struct field %s has type %s but Discord option has type %s", fieldName, structFieldType, optType))
			continue
		}

		// Set field
		valField := val.Field(i)
		if !valField.CanSet() {
			errs = append(errs, fmt.Sprintf("cannot set struct field %s", fieldName))
			continue
		}

		switch opt.Type {
		case discordgo.ApplicationCommandOptionString:
			valField.SetString(opt.StringValue())
		case discordgo.ApplicationCommandOptionInteger:
			valField.SetInt(opt.IntValue())
		case discordgo.ApplicationCommandOptionBoolean:
			valField.SetBool(opt.BoolValue())
		case discordgo.ApplicationCommandOptionNumber:
			valField.SetFloat(opt.FloatValue())
		}
	}

	if len(errs) > 0 {
		return fmt.Errorf("failed to scan options into struct:\n%s", strings.Join(errs[:], "\n"))
	}

	optsNotFoundInStruct := []string{}
	for key, scanned := range scannedFields {
		if !scanned {
			optsNotFoundInStruct = append(optsNotFoundInStruct, key)
		}
	}

	if len(optsNotFoundInStruct) > 0 {
		return fmt.Errorf("options not scanned into struct: %s", strings.Join(optsNotFoundInStruct[:], ","))
	}

	return nil
}
