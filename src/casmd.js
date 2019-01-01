//
//  Copyright (C) 2016-2019 CASM Organization <https://casm-lang.org>
//  All rights reserved.
//
//  Developed by: Philipp Paulweber
//                <https://github.com/casm-lang/casm-lang.plugin.monaco>
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
//  Based on https://github.com/TypeFox/monaco-languageclient Project:
//  Copyright (c) 2017 TypeFox GmbH (http://www.typefox.io). All rights reserved.
//  Licensed under the MIT License. See License.txt in the project root for license information.
//
//  Based on https://github.com/Microsoft/monaco-editor-samples Project:
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.txt in the project root for license information.
//

var WebSocket = require('ws').Server;
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
, { name:         'memcheck'
  , alias:        'm'
  , type:         Boolean
  , defaultValue: false
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

function LanguageServer()
{
    if( args.memcheck )
    {
        this.name = 'valgrind';
        this.args = [ '--leak-check=full', '-v', 'casmd', 'lsp', '--stdio' ];
    }
    else
    {
        this.name = 'casmd';
        this.args = [ 'lsp', '--stdio' ];
    }

    this.process = Process( this.name, this.args );
    this.pid = this.process.pid

    console.log( "~~~ ~~~ LSP(" + this.pid + "): start '" + this.name + " " + this.args.join(' ') + "'" );

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
	      console.log( '~~~ ~~~ LSP(' + this.pid + '): exit: ' + code );
      }
    );

    this.process.on
    ( 'error'
    , function( error )
      {
	      console.log( '~~~ ~~~ LSP(' + this.pid + '): error: ' + error );
      }
    );
}

LanguageServer.prototype.stop = function()
{
    console.log( "languageServer: stop" );
    this.process.kill( 'SIGINT' );
}


var webSocket = new WebSocket
( { port: wssPort
  }
);

webSocket.on
( 'connection'
, function( webSocket )
  {
      var casmd = new LanguageServer();

      console.log( '' );
      console.log( 'WSS <=> LSP(' + casmd.pid + '): wss://' + localhost + ':' + wssPort );

      casmd.process.stdin.setEncoding( 'utf8' );

      casmd.process.stdout.setEncoding( 'utf8' );
      casmd.process.stdout.on
      ( 'data'
      , function( data )
        {
	        var message = data.toString()
	        console.log( 'WSS <-- LSP(' + casmd.pid + '): ' + message.length + '\n' + message );
            webSocket.send( message.toString() );
        }
      );

      webSocket.on
      ( 'message'
      , function( message )
        {
	        console.log( 'WSS --> LSP(' + casmd.pid + '): ' + message.length + '\n' + message );
            casmd.process.stdin.write( message );
        }
      );

      webSocket.on
      ( 'close'
      , function()
        {
	        console.log( 'WSS ~~~ ~~~: disconnected' )
            casmd.stop();
        }
      );

      webSocket.on
      ( 'error'
      , function( error )
        {
	        console.log( 'WSS ~~~ ~~~: error: ' + error )
            casmd.stop();
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
