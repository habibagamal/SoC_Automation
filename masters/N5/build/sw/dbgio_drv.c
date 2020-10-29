#include    "base_addr.h"
#include    "macros.h"

#define     DBGIO_DATA_REG              0x00000000
#define     BIT_ST                      16
#define     BIT_PF                      17
#define     BIT_TMR_RST                 31

unsigned int volatile * const DBGIO_DATA = (unsigned int *) (DBGIO_BASE_ADDR_0 + DBGIO_DATA_REG);

void dbgio_write(unsigned int data){
    *DBGIO_DATA = data;
}

unsigned int dbgio_read(){
    unsigned int data;
    data = *DBGIO_DATA;
    return data;
}

void dbgio_setTestID(unsigned char id){
    unsigned int data = dbgio_read();
    data &= 0xFFFFFF00;
    data |= ( (unsigned int)id) ;
    dbgio_write(data);
}

void dbgio_startTest(unsigned char id, unsigned int timeout){
    unsigned int data = 0;
    data |= ((unsigned int) id);
    data |= (timeout << 18);
    SET_BIT(data, BIT_TMR_RST);
    CLR_BIT(data, BIT_ST);
    dbgio_write(data);
    SET_BIT(data, BIT_ST);
    dbgio_write(data);
}

void dbgio_endTest(unsigned char passed){
    unsigned int data = dbgio_read();
    CLR_BIT(data, BIT_ST);
    if(passed) SET_BIT(data, BIT_PF);
    dbgio_write(data);
}