#include "./sw/gpio.c"
#include "./sw/tmr_drv.c"
#include "./sw/pwm_drv.c"
#include "./sw/i2c_drv.c"
#include "./sw/spi_drv.c"
#include "./sw/23lc512_drv.c"
#include "./sw/PMIC_regs.h"
#define GPIO_DATA 9

unsigned int volatile * const DEBUG_REG = (unsigned int *) (AHB_db_reg_BASE_ADDR);

void GPIO_TEST();
void timer_test();
void PWM_test();
void SPI_test();
void I2C_test();

int main(){

	// GPIO_TEST(0xffff, GPIO_DATA);
	PWM_test();
  	return 0;
}

// passed
void GPIO_TEST(int dir, int write){
	gpio_set_dir(dir);		// 7-4: Input, 3-0: Output
	gpio_write(write);
}

// passed
void timer_test(){
	tmr_disable();
	tmr_init(9, 99);
	tmr_clearOVF();
	tmr_enable();
	while(tmr_getOVF() == 0);
	*DEBUG_REG = 0xa;
}

// passed
void PWM_test(){
	pwm_disable();
	pwm_init(199, 49, 9);
	pwm_enable();
	for(int volatile i=0; i<500; i++);
	*DEBUG_REG = 0xb;
}

// passed
void SPI_test(){
	int data;
  	spi_configure(0,0,20);
  	// some dummy delay
  	for(int i=0;i<25;i++);
 	write_byte(21, 55);
  	data = read_byte(21);
  	if(data == 55) 
	  	*DEBUG_REG = 0xa;
	else 
		*DEBUG_REG = 0xf;
}

// passed
void I2C_test(){
	i2c_init(5);
	i2c_send(6, 69);
	*DEBUG_REG = 0xa;
}
