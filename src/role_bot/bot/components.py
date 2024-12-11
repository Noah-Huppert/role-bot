from typing import Awaitable, Callable, Generic, List, Optional, TypeVar, TypedDict

import discord

from role_bot.bot.services import DEFAULT_PAGE_SIZE


PageResultT = TypeVar('PageResultT')
class LoadPageFnResult(TypedDict, Generic[PageResultT]):
    """Result of :ref:`PaginatedSelectLoadPageFn`.
    
    :ivar options: The options for the page
    :ivar results: The raw data form of the page
    :ivar total: The total number of options
    :ivar page_total: The total number of options in the page
    """
    options: List[discord.SelectOption]
    results: List[PageResultT]
    total: int
    page_total: int

class PageFnResult(LoadPageFnResult[PageResultT]):
    """Result of :ref:`PaginatedSelect.page`.
    
    :ivar has_prev_page: If a previous page is available
    :ivar has_next_page: If a next page is available
    """
    page: int
    page_size: int
    hav_prev_page: bool
    has_next_page: bool

PaginatedSelectLoadPageFn = Callable[[PageFnResult], Awaitable[LoadPageFnResult[PageResultT]]]
"""Called when a specific page of options is requested.

:param page: The page number to load
:param page_size: The number of options to load
:return: The options for that page, must return more than 0 options
"""

PaginaedSelectOnNewPage = Callable[[int, int], Awaitable[None]]
"""Called when a new page is loaded."""

class PaginatedSelect(discord.ui.Select, Generic[PageResultT]):
    """Select menu with hook to paginate options."""

    _load_page: PaginatedSelectLoadPageFn[PageResultT]
    _page_size: int
    _on_new_page: Optional[PaginaedSelectOnNewPage]

    def __init__(
        self,
        load_page: PaginatedSelectLoadPageFn,
        on_new_page: Optional[PaginaedSelectOnNewPage] = None,
        page_size=DEFAULT_PAGE_SIZE,
        **kwargs,
    ):
        super().__init__(
            max_values=1,
            options=[discord.SelectOption(label="Loading...", value="loading")],
            **kwargs
        )

        self._load_page = load_page
        self._page_size = page_size
        self._on_new_page = on_new_page

    async def page(self, page: int) -> PageFnResult:
        """Load a specific page of options.
        
        :raise ValueError if load page returns no options
        """
        # Load values
        res = await self._load_page(page=page, page_size=self._page_size)
        if len(res['options']) == 0:
            raise ValueError("Cannot return 0 options from load page callback")

        # Set options
        self.options = res['options']
        self.max_values = min(self._page_size, res['page_total'])

        # Call handler
        return_val = {
            **res,
            'page': page,
            'page_size': self._page_size,
            'has_prev_page': page > 0,
            'has_next_page': res['total'] > (page + 1) * self._page_size,
        }
        if self._on_new_page is not None:
            await self._on_new_page(return_val)

        return return_val