import traceback
import logging
import discord

logger = logging.getLogger(__name__)

def interaction_error_handler(func):
    """Decorator to catch exceptions and send stack trace as an ephemeral message."""
    async def wrapper(self, interaction: discord.Interaction, *args, **kwargs):
        try:
            return await func(self, interaction, *args, **kwargs)
        except Exception as e:
            # Get the stack trace
            stack_trace = traceback.format_exc()
            tb = traceback.extract_tb(e.__traceback__)
    
            # Get the last traceback entry (where the exception occurred)
            last_entry = tb[-1]
            
            # Extract filename and line number
            filename = last_entry.filename
            line_number = last_entry.lineno
            
            # Log the error (optional)
            logger.error(f"Error in {func.__name__}: {e}\n{stack_trace}")
            
            # Send the stack trace as an ephemeral message
            msg_sender = interaction.response.send_message
            if interaction.response.is_done():
                msg_sender = interaction.followup.send

            await msg_sender(
                embeds=[
                    discord.Embed(
                        title="An error occurred",
                        description=f"""An error occurred in `{filename}:{line_number}`:
```python
{stack_trace}
```""",
                    ),
                ],
                ephemeral=True
            )
    return wrapper