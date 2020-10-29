#include "base_addr.h"
#include "macros.h"

// + PWMPRE (RW - 16): clock prescalar (tmer_clk = clk / (PRE+1))
// + PWMCMP1 (RW - 4): PWM Compare register 1 -- period
// + PWMCMP2 (RW - 8): PWM Compare register 1 -- duty cycle
// + PWMCTRL (RW - 32): bit0: Enable

#define     PWM_CMP1_REG        0x00000004
#define     PWM_CMP2_REG        0x00000008
#define     PWM_PRE_REG         0x00000010
#define     PWM_CTRL_REG        0x00000020

// CTRL register fields
#define     PWM_EN_BIT          0x0
#define     PWM_EN_SIZE         0x1

unsigned int volatile * const PWM_CTRL = (unsigned int *) (PWM_BASE_ADDR_0 + PWM_CTRL_REG);
unsigned int volatile * const PWM_PRE = (unsigned int *) (PWM_BASE_ADDR_0 + PWM_PRE_REG);
unsigned int volatile * const PWM_CMP1 = (unsigned int *) (PWM_BASE_ADDR_0 + PWM_CMP1_REG);
unsigned int volatile * const PWM_CMP2 = (unsigned int *) (PWM_BASE_ADDR_0 + PWM_CMP2_REG);