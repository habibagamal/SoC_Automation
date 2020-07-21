MEMORY
{
    rom(RX)   : ORIGIN = 0x00000000, LENGTH = 0x100000        /* ROM starts at 0 and has a length of 1MB */
    ram(WAIL) : ORIGIN = 0x20000000, LENGTH = 0x4000
}
ENTRY(Reset_Handler)
SECTIONS
{
    .text : {
        . = ORIGIN(rom);
        . = ALIGN(4);
        *(.isr_vector*)
        . = ALIGN(4);
        . = 0x100;
        *(.text*)
        *(.rodata*)
    } > rom
    .bss :
    {
        . = ALIGN(4);
        __bss_start__ = .;
        *(.bss*)
        *(COMMON)
        . = ALIGN(4);
        __bss_end__ = .;
    } > ram
    .data : { *(.data*) } > ram
    .stack_dummy (COPY):
    {
        *(.stack*)
    } > ram
    __StackTop = ORIGIN(ram) + LENGTH(ram);
    __StackLimit = __StackTop - SIZEOF(.stack_dummy);
}