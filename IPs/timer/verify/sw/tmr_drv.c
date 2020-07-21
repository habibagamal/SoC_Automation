#include "tmr_drv.h"
#include "tmr_regs.h"


// Timer_clk = clk / (PRE+1)
void tmr_init(int cmp, int pre){
  *TMR_CMP = cmp;
  *TMR_PRE = pre;
  // *((unsigned int *)(0x40500008)) = cmp;
  // *((unsigned int *)(0x40500004)) = pre;
}

void tmr_enable(){
  // SET_BIT(*TMR_EN, TMR_EN_BIT);
  *TMR_EN = 0xFFFFFFFF;
}

void tmr_disable(){
  // CLR_BIT(*TMR_EN, TMR_EN_BIT);
  *TMR_EN = 0x0;
}

void tmr_clearOVF(){
  // SET_BIT(*TMR_OVCLR, TMR_OVCLR_BIT);
  // CLR_BIT(*TMR_OVCLR, TMR_OVCLR_BIT);
  *TMR_OVCLR = 0x1;
  *TMR_OVCLR = 0x0;
}

unsigned int tmr_getOVF(){
  return *TMR_STATUS;
}