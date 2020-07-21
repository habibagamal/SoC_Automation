#include "./sw/gpio.c"

#define GPIO_DATA 9

void GPIO_TEST();

int main(){

	GPIO_TEST(0xffff, GPIO_DATA);
  	return 0;
}

// passed
void GPIO_TEST(int dir, int write){
	gpio_set_dir(dir);		
	gpio_write(write);
}