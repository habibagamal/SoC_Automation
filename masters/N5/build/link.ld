ENTRY(_start)

/* Define the physical memory */
/* One memory block of 4KB   */
/* 1st 3KB is called ram     */
/* last 1KB is called stack  */

MEMORY
{
    FLASH (x) :
        ORIGIN = 0x0
        LENGTH = 1M
    SRAM (rw) :
        ORIGIN = 0x20000000,
        LENGTH = 32K
    stack (rw):
        ORIGIN = 0x20000000 + 28K
        LENGTH = 4K
}


PROVIDE(_fstack = ORIGIN(stack) + LENGTH(stack) - 4);
