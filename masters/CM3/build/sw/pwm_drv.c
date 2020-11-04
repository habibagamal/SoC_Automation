#include "pwm_drv.h"
#include "pwm_regs.h"
/*
	A simple 32-bit PWM generator device driver
	PRE: clock prescalar (tmer_clk = clk / (PRE+1))
	TMRCMP1: Timer CMP register (period)
	TMRCMP2: PWN level change Comparator

	PWM period = (CMP1 + 1)/timer_clk = (CMP1 + 1)*(PRE + 1)/clk
	PWM off cyle % = (CMP1 + 1)/(CMP2 + 1)
*/

void pwm_init(unsigned int cmp1, unsigned int cmp2, unsigned int pre){
  *PWM_CMP1 = cmp1;
  *PWM_CMP2 = cmp2;
  *PWM_PRE = pre;
}

void pwm_enable(){
  *PWM_CTRL = 0x1;
}

void pwm_disable(){
  *PWM_CTRL = 0x0;
}