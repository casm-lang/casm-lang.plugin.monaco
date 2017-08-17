//
//  Copyright (c) 2017 CASM Organization
//  All rights reserved.
//
//  Developed by: Philipp Paulweber
//                https://github.com/casm-lang/casm-lang.plugin.monaco
//
//  This file is part of casm-lang.plugin.monaco.
//
//  casm-lang.plugin.monaco is free software: you can redistribute it and/or modify
//  it under the terms of the GNU General Public License as published by
//  the Free Software Foundation, either version 3 of the License, or
//  (at your option) any later version.
//
//  casm-lang.plugin.monaco is distributed in the hope that it will be useful,
//  but WITHOUT ANY WARRANTY; without even the implied warranty of
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
//  GNU General Public License for more details.
//
//  You should have received a copy of the GNU General Public License
//  along with casm-lang.plugin.monaco. If not, see <http://www.gnu.org/licenses/>.
//
//
//  Copyright (c) 2017 TypeFox GmbH (http://www.typefox.io). All rights reserved.
//  Licensed under the MIT License. See License.txt in the project root for license information.
//
//
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.txt in the project root for license information.
//

var WebSocket = require('ws').Server;
var UdpSocket = require('dgram');
var UdpBuffer = require('buffer').Buffer;
var Process = require('child_process').spawn;

var Args = require('command-line-args')

const argsDefinition =
[ { name:         'standalone'
  , alias:        'S'
  , type:         Boolean
  , defaultValue: false
  }
, { name:         'standalone-port'
  , alias:        's'
  , type:         Number
  , defaultValue: 8080
  }
, { name:         'websocket-port'
  , alias:        'w'
  , type:         Number
  , defaultValue: 8010
  }
];

var options = null;

try
{
    args = Args( argsDefinition );
}
catch( e )
{
    console.error( "casmd.js: " + e.message );
    process.exit();
}

// console.log( args );

const wssPort = args['websocket-port'];
const localhost = '127.0.0.1';

if( args.standalone )
{
    var Express = require( 'express' );

    const httpPort = args[ 'standalone-port' ];

    var httpServer = Express();
    httpServer.use( '/', Express.static( __dirname + '/http' ) );
    httpServer.use( '/_nodejs', Express.static( __dirname + '/../obj' ) );
    httpServer.use( '/_public', Express.static( __dirname + '/../node_modules' ) );
    httpServer.use( '/_source', Express.static( __dirname + '/../src' ) );
    httpServer.listen( httpPort );
    console.log( 'casmd.js: serving content on http://localhost:' + httpPort );
}

function LanguageServer( port )
{
    this.name = 'casmd';
    this.args = [ 'lsp', '--udp4', localhost + ':' + port ];
    this.port = port;
    this.process = null;

    console.log( "languageServer(" + this.port + "): start '" + this.name + " " + this.args.join(' ') + "'" );

    this.process = Process( this.name, this.args );

    this.process.stdout.setEncoding( 'utf8' );
    this.process.stdout.on
    ( 'data', function( data )
      {
	  var str = data.toString()
	  var lines = str.split( /(\r?\n)/g );
	  console.log( lines.join('') );
      }
    );

    this.process.stderr.setEncoding( 'utf8' );
    this.process.stderr.on
    ( 'data', function( data )
      {
	  var str = data.toString()
	  var lines = str.split( /(\r?\n)/g );
	  console.log( lines.join('') );
      }
    );

    this.process.on
    ( 'close', function( code )
      {
	  console.log( "languageServer(" + this.port + "): close" );
      }
    );

    this.process.on
    ( 'error', function()
      {
	  console.log( "languageServer(" + this.port + "): error" );
      }
    );
}

LanguageServer.prototype.stop = function()
{
    console.log( "languageServer: stop" );
    this.process.kill( 'SIGINT' );
}

var cnt = -1;

function setupConnection( webSock, udpSock, udpPort, udpHost )
{
    cnt++;

    console.log( '' );
    console.log( 'WSS <=> UDP: connection #' + cnt );
    console.log( '             wss://' + localhost + ':' + wssPort );
    console.log( '             udp://' + localhost + ':' + udpPort );

    var casmd = new LanguageServer( udpPort );

    webSock.on
    ( 'message', function( message )
      {
	  console.log( 'WSS --> UDP: ' + message.length );
          var packet = new UdpBuffer( message );
          udpSock.send( packet, 0, packet.length, udpPort, udpHost );
      }
    );

    webSock.on
    ( 'error', function( error )
      {
	  console.log( 'WSS ~~~ ~~~: error: ' + error )
	  casmd.stop();
      }
    );

    webSock.on
    ( 'close', function()
      {
	  console.log( 'WSS ~~~ ~~~: disconnected' )
	  casmd.stop();
      }
    );

    udpSock.on
    ( 'message', function( message, flags )
      {
	  console.log( 'WSS <-- UDP: ' + message.length );
          webSock.send( message.toString() );
      }
    );

    udpSock.on
    ( 'error', function( error )
      {
	  console.log( '~~~ ~~~ UDP: error: ' + error )
      }
    );

    udpSock.on
    ( 'close', function()
      {
	  console.log( '~~~ ~~~ UDP: disconnected' )
	  casmd.stop();
      }
    );
}

var webSock = new WebSocket
( { port: wssPort
  }
);

webSock.on
( 'connection', function( webSock )
  {
      var udpSock = UdpSocket.createSocket( 'udp4' );
      var udpInfo = UdpSocket.createSocket( 'udp4' );
      udpInfo.bind()

      udpInfo.on
      ( 'listening', function()
	    {
	        var udpPort = udpInfo.address().port;
	        var udpHost = localhost;
	        udpInfo.close
	        ( function()
	          {
		          setupConnection( webSock, udpSock, udpPort, udpHost );
	          }
	        );
	    }
      );
  }
);


//
//  Local variables:
//  mode: javascript
//  indent-tabs-mode: nil
//  c-basic-offset: 4
//  tab-width: 4
//  End:
//  vim:noexpandtab:sw=4:ts=4:
//
