#include "base_addr.h"
// #include "dbgio_drv.h"
//#include "../../sw/gpio_drv.h"
#if APB_GPIO_BASE_ADDR != INVALID_ADDR
    #define GPIO_BASE_ADDR APB_GPIO_BASE_ADDR
#else
    #define GPIO_BASE_ADDR AHB_GPIO_BASE_ADDR
#endif

void gpio_set_dir(unsigned int d) {
	*((unsigned int *)(GPIO_BASE_ADDR+0x10)) = d;
}

void gpio_write(unsigned int d) {
	*((unsigned int *)(GPIO_BASE_ADDR+0x04)) = d;
}

unsigned int gpio_read(){
	return *((unsigned int *)(0x80000000));
}

// int main(){
// 	// dbgio_startTest(0x02, 0xFFF);

// 	gpio_set_dir(0xF0);		// 7-4: Input, 3-0: Output
// 	gpio_write(0x09);
// 	int data = gpio_read();
// 	// if((data>>4) == 3)
// 	// 	dbgio_endTest(1);
// 	// else
// 	// 	dbgio_endTest(0);
//   	while(1);
//   	return 0;
// }


