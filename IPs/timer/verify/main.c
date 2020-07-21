#include "./sw/tmr_drv.c"

void timer_test();

int main(){

	timer_test();
  	return 0;
}

// passed
void timer_test(){
	tmr_disable();
	tmr_init(9, 99);
	tmr_clearOVF();
	tmr_enable();
	while(tmr_getOVF == 0);
	// GPIO_TEST(0xffff, 0xabcd);
}