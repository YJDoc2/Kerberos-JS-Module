const path = require('path');
const fs = require('fs');

import DB from './DB';
import ServerError from '../ServerError';

export default class LocalDB extends DB {
  ticketPath = undefined;

  constructor(ticketFolderPath = null) {
    if (ticketFolderPath === null) {
      ticketFolderPath = path.join(__dirname, 'Tickets');
    }

    if (!fs.existsSync(ticketFolderPath)) {
      fs.mkdirSync(ticketFolderPath);
    }
    this.ticketPath = ticketFolderPath;
  }

  save(serverName, ServerObj) {
    const pathname = path.join(this.ticketPath, serverName);

    fs.writeFileSync(pathname, JSON.stringify(ServerObj));
  }

  get(serverName) {
    const pathname = path.join(this.ticketPath, serverName);
    if (!fs.existsSync(pathname)) {
      throw new ServerError(
        `Requested Server with name ${serverName} not Found`
      );
    }
    let ticketStr = '';
    ticketStr = fs.readFileSync(pathname, 'utf8');
    if (ticketStr === '') {
      throw new ServerError(
        `Requested Server with name ${serverName} not Found`
      );
    }
    try {
      const t = JSON.parse(ticketStr);
      return t;
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw new ServerError(
          `Requested Server with name ${serverName} not Found`
        );
      } else {
        throw e;
      }
    }
  }
}
