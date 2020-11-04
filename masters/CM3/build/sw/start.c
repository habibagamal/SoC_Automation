extern void _estack(void);  // to force type checking
void Reset_Handler(void);
void default_handler (void) 
{
  while(1);
}

void __attribute__ ((weak)) __libc_init_array (void){}

// Linker supplied pointers

extern unsigned long _sidata;
extern unsigned long _sdata;
extern unsigned long _edata;
extern unsigned long _sbss;
extern unsigned long _ebss;

extern int main(void);

void Reset_Handler(void) {
    unsigned long *src , *dst, *dstend;

    // Copy data initializers
    src = &_sidata;
    dst = &_sdata;
    dstend = &_edata; 
    while (dst < dstend)
        *(dst ++) = *(src ++);
    
    // Zero bss
    dst = &_sbss;
    while (dst < &_ebss)
        *(dst ++) = 0;

    //SystemInit ();
    __libc_init_array ();
    main();
    while (1) {}
}


/* Vector Table */
void NMI_Handler (void) { while(1);}//__attribute__ ((weak,  alias ("default_handler")));
void HardFault_Handler (void) { 
    volatile unsigned int *p =  (unsigned int *) 0xE000ED2A;
    int x = *p;
    while(1);
}
    //__attribute__ ((weak,  alias ("default_handler")));
void SVC_Handler (void) { while(1);}//__attribute__ ((weak,  alias ("default_handler")));
void PendSV_Handler (void) { while(1);}//__attribute__ ((weak,  alias ("default_handler")));
void SysTick_Handler (void) { while(1);}//__attribute__ ((weak,  alias ("default_handler")));


__attribute__ ((section(".isr_vector")))
void (* const g_pfnVectors[])(void) = {
	_estack,
	Reset_Handler,
	NMI_Handler,
	HardFault_Handler,
	0, 0, 0,
	0, 0, 0, 0,
	SVC_Handler,
	0,
	0,
	PendSV_Handler,
	SysTick_Handler,
    0, 0, 0, 0, 0, 0, 0, 0, 
    0, 0, 0, 0, 0, 0, 0, 0, 
    0, 0, 0, 0, 0, 0, 0, 0, 
    0, 0, 0, 0, 0, 0, 0, 0
};