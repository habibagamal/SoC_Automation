#include "./sw/gpio.c"
#include "./sw/tmr_drv.c"
#include "./sw/pwm_drv.c"
#include "./sw/i2c_drv.c"
#include "./sw/spi_drv.c"
#include "./sw/23lc512_drv.c"
#include "./sw/PMIC_regs.h"
#define GPIO_DATA 9

unsigned int volatile * const DEBUG_REG = (unsigned int *) (DEBUG_REG_ADDR);

void GPIO_TEST();
void timer_test();
void PWM_test();
void SPI_test();
void I2C_test();

int main(){

	// GPIO_TEST(0xffff, GPIO_DATA);
	I2C_test();
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
	while(tmr_getOVF == 0);
	*DEBUG_REG = 0xa;
	// GPIO_TEST(0xffff, 0xabcd);
}

// passed
void PWM_test(){
	pwm_disable();
	pwm_init(199, 49, 9);
	pwm_enable();
	for(int volatile i=0; i<500; i++);
	*DEBUG_REG = 0xb;
	// GPIO_TEST(0xffff, 0xaaaa);
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
	  	// GPIO_TEST(0xffff, 0xabcd);
	else 
		*DEBUG_REG = 0xf;
		// GPIO_TEST(0xffff, 0xdcba);
}

// passed
void I2C_test(){
	// i2c_init(5);

	// //SEQ power down enabled
	// i2c_send(0, SEQ_BASE_ADDR+SEQ_POWER_DOWN_ADDR, 1);
	// //SEQ power down disabled
	// i2c_send(0, SEQ_BASE_ADDR+SEQ_POWER_DOWN_ADDR, 0);

	// //LDO_SEL SEQ_COUNT = 0
	// i2c_send(0, LDO_SEL_BASE_ADDR+SEQ_count, 0);
	// //LDO_SEL EN = 1
	// i2c_send(0, LDO_SEL_BASE_ADDR+EN, 1);
	// //LDO_SEL OUTSEL = 1
	// i2c_send(0, LDO_SEL_BASE_ADDR+LDO_SEL_OUTSEL, 1);

	// //LDO SEQ_COUNT = 0
	// i2c_send(0, LDO_BASE_ADDR+SEQ_count, 1);
	// //LDO EN = 1
	// i2c_send(0, LDO_BASE_ADDR+EN, 1);

	// //SEQ power UP enabled
	// i2c_send(0, SEQ_BASE_ADDR+SEQ_POWER_UP_ADDR, 1);
	// //SEQ power UP disabled
	// i2c_send(0, SEQ_BASE_ADDR+SEQ_POWER_UP_ADDR, 0);

	// //SEQ power down enabled
	// i2c_send(0, SEQ_BASE_ADDR+SEQ_POWER_DOWN_ADDR, 1);
	// //SEQ power down disabled
	// i2c_send(0, SEQ_BASE_ADDR+SEQ_POWER_DOWN_ADDR, 0);

	// int count = 20;
	// while(count--);
	i2c_init(5);
	i2c_send(6, 69);
	*DEBUG_REG = 0xa;
	// GPIO_TEST(0xffff, 0xabcd);
}