# Kerberos JS Module

This is a Javascript Module for implementing Kerberos Protocol.  
This does not actually implement the Kerberos Protocol at low-level api, but provides helper classes that can be used to implement Kerberos over some other protocol such as HTTP.

For More information on Kerberos Protocol, see <a href='https://github.com/YJDoc2/Kerberos-JS-Module/blob/master/Kerberos.md'>Kerberos md</a> file.

For API documentation see <a href = 'https://github.com/YJDoc2/Kerberos-JS-Module/blob/master/API.md'>API md</a> file.

There is a corresponding python library of this project : <a href='https://github.com/YJDoc2/Kerberos-Python-Library'>Kerberos Python Library</a>

Also For example usage of this , check out <a href='https://github.com/YJDoc2/Kerberos-Examples'>Kerberos Examples</a> Repository. It contains commented examples of how to use this and python library.

<strong>NOTE</strong> Before any usage of this, one should test the security aspects of this thoroughly.

## About

This module provides classes for setting up Kerberos methods over a protocol.

This contains has three main parts :

<ul>
<li>KDC classes</li>
<li>Server class</li>
<li>Client class</li>
</ul>

Key Distribution Centre (KDC) classes, which are used in generating initial authentication and Ticket Granting Ticket (TGT), and then tickets for individual servers, which are to be protected by this protocol.
The main classes are KerberosAS and KerberosTGS, and KerberosKDC provides an easier-to-use interface over them for the cases when Authentication Service and Ticket Granting Service is to be set up in same server program.
<strong>NOTE</strong> that KerberosKDC class does not provide any extra functionality, and its work can be done by using individual instances of KerberosAS and KerberosTGS. The KerberosKDC class is implemented so that one need not maintain instances of two classes.

The Server class provides methods which are used on a server that is to be protected by Kerberos.  
<strong>NOTE</strong> that this does not actually set up any server, just contain methods related to kerberos protocol that are used on Server.

The Client class provides methods which are used by a client which is used to access data on servers protected by Kerberos.
<strong>NOTE</strong> that this does not actually set up any client, just contain methods related to kerberos protocol that are used by client.

This module provides default classes for basic database and cryptographic requirements,but custom classes can be used as well by making them extend appropriate classes. See API documentation for more information.

## Dependencies

This Module use <a href='https://github.com/ricmoo/aes-js'>aes-js</a> module for the default cryptographic needs.

Other than that this has as dev-dependencies of babel for compiling the library to common js, and chai with mocha as testing framework.

This also uses browserify for generating browser usable script from module, and uglify-js for compacting it.

## Basic Usage Information

This module can be used as a JS module in node based projects, a Frontend JS Framework, as well as with pure html-css-js websites.

The <a href='https://github.com/YJDoc2/Kerberos-JS-Module/blob/master/kerberos.js'>Kerberos.js</a> and <a href='https://github.com/YJDoc2/Kerberos-JS-Module/blob/master/kerberos.min.js'>Kerberos.min.js</a> both files include client classes and other required classes used for client side methods, and can be used as stand-alone scripts. These pack the dependency AES-JS inside it, so it does not need to be included separately. On the downside, that makes its size quite big.

<strong>Note</strong> that this was developed with idea that made the three components mentioned in about section function independently. Which means it is not compulsory to use KDC,Server and Client of JS module only.The components of this JS module can be used along with those in Python library. The examples repository shows the use in this manner only.

The API has been decently commented, though not as best it could have been.
The detailed API documentation for usage can be found in API md file.

The lib folder contains the files used for development, and the dist folder contains the files from lib compiled to common-js syntax that can be used with node , using babel.

The outermost index.js file exports all the components from dist folder in common js.

All classes and constants exported by the module can be brought in by using :<br />
<code>const Kerberos = require('path/to/kerberos-js/folder');</code><br />
After which individual components can be used as :<br />
<code>const componentClassInstance = Kerberos.componentClassName();</code>

<strong>Note</strong> that some methods of API have a large number of params, upto 6, clearly breaking the max-number-of-params-should-be-3 guideline of good programming.For slightly easier use of these, **all params** of **all** methods follow the following order :  
random number ; request server ; UIDs for user : key ; encryption/decryption data ; tickets ; optional params.<br />
whichever are present.

## Build Information

Run <code>npm run build</code> for building the library.
This library uses babel for having the easier import syntax, and then compiling it to common-js.
The package json file contains scripts for building the library : <code>build</code> for compiling the module,then generating kerberos js using browserify and compressing it using uglify-js.
Then their are scripts that achieve the individual steps in that building process.

## Working/Security

This uses the AES 256 bit CTR mode by default for all encryptions and decryptions.
For security considerations check <a href='https://github.com/YJDoc2/Kerberos-JS-Module/blob/master/security.md'>security md</a>.
<strong>Note that developer neither gives any guarantee nor takes any responsibility for the security of this module.</strong>
