export const AUTH_INIT_VAL = 5; // Init value for Auth ticket
export const TGT_INIT_VAL = 5; // Init value for Ticket Granting Ticket
export const AUTH_TICKET_LIFETIME = 24 * 60 * 60 * 60 * 1000; //1 Day
export const TICKET_LIFETIME = 10 * 60 * 1000; //10 min

// Min and max range for choosing a random value for init_val of new servers
export const SERVER_INIT_RAND_MIN = 1;
export const SERVER_INIT_RAND_MAX = 2147483647;
