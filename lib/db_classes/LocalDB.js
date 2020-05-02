const path = require('path');
const fs = require('fs');

import DB from './DB';
import ServerError from '../ServerError';

/**
 * This is a class used as defualt DB for saving tickets and server data tickets.
 * This creates a folder  on given path or else creates a folder called 'Tickets',
 * in directory from which the process calling was invoked.
 * This saves and loads data in plain text format, using JSON module to convert object to string, and string to object.
 * All saved object files are named as given name.
 */
export default class LocalDB extends DB {
  ticketPath = undefined;

  constructor(ticketFolderPath = undefined) {
    super();
    // If no ticket path is provided, defualt to Tickets in directory from which process calling this was invoked
    if (!ticketFolderPath) {
      ticketFolderPath = path.join('.', 'Tickets');
    }

    // Create new directory if path does not exist
    if (!fs.existsSync(ticketFolderPath)) {
      fs.mkdirSync(ticketFolderPath, { recursive: true });
    }
    this.ticketPath = ticketFolderPath;
  }

  save(serverName, ServerObj) {
    const pathname = path.join(this.ticketPath, serverName);

    /** For default ticketPath, Servername = 'A' will create a text file
     *  at path './Tickets/A'
     */
    fs.writeFileSync(pathname, JSON.stringify(ServerObj));
  }

  get(serverName) {
    const pathname = path.join(this.ticketPath, serverName);

    // Any file with given name was not found
    if (!fs.existsSync(pathname)) {
      throw new ServerError(
        `Requested Server with name ${serverName} not Found`
      );
    }

    let ticketStr = '';

    ticketStr = fs.readFileSync(pathname, 'utf8');

    // Empty File, or some error in reading file
    if (ticketStr === '') {
      throw new ServerError(
        `Requested Server with name ${serverName} not Found`
      );
    }
    try {
      const t = JSON.parse(ticketStr);
      return t;
    } catch (e) {
      throw new ServerError('Error in decoding server information');
    }
  }
}
