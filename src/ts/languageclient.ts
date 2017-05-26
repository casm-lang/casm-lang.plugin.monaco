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

import
{ listen
, MessageConnection
}
from 'vscode-ws-jsonrpc';

import
{ BaseLanguageClient
, CloseAction
, ErrorAction
, createMonacoServices
, createConnection
}
from 'monaco-languageclient';

const ReconnectingWebSocket = require( 'reconnecting-websocket' );

const value = `CASM

init hello_world

rule hello_word =
{
    println( "Hello world!" )
}
`;

monaco.languages.register
( { id: 'casm'
  , extensions: [ '.casm' ]
  , aliases: [ 'CASM', 'casm' ]
  , mimetypes: [ 'text/plain'],
  }
);

var w = <any>window;
w.editor = monaco.editor.create
( document.getElementById( "container" )!
, {
    model: monaco.editor.createModel
    ( value
    , 'casm'
    , monaco.Uri.parse( 'inmemory://model.casm' )
    )
  }
);


function createUrl( path: string ): string
{
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${location.host}${path}`;
}

function createWebSocket( url: string ): WebSocket
{
    const socketOptions =
    { maxReconnectionDelay: 5000
    , minReconnectionDelay: 1000
    , reconnectionDelayGrowFactor: 1.3
    , connectionTimeout: 5000
    , maxRetries: Infinity
    , debug: false
    };

    return new ReconnectingWebSocket
    ( url
    , [ "binary" ]
    , socketOptions
    );
}


const url = createUrl( '/casmd' );

const webSocket = createWebSocket( url );

w.casmd = false;

listen
( { webSocket
  , onConnection: connection =>
    {
        const languageClient = createLanguageClient( connection );
        const disposable = languageClient.start();
        connection.onClose( () =>
        {
	        w.casmd = false;
	        disposable.dispose();
	    });

	    w.casmd = true;

	    // w.editor.addAction
	    // ( { id: 'casmd-version'
	    //     , label: 'Display version information of casmd'
	    //     , keybindings: [ monaco.KeyMod.CtrlCmd, monaco.KeyCode.F4 ]
	    //     , keybindingContext: null
	    //     , contextMenuGroupId: 'navigation'
	    //     , contextMenuOrder: 1.5
	    //     , run: () => {
	    // 	console.log("CASMd");
	    // 	if( w.casmd )
	    // 	{
	    // 	    webSocket.send( "CASMd" );
	    // 	}
	    // 	return null;
	    //     }
	    //   }
	    // );

	    // webSocket.addEventListener('message', function(e: any) { // : void => {
	    //     // flags.binary will be set if a binary data is received.
	    //     // flags.masked will be set if the data was masked.
	    //     // ws.binaryType = 'arraybuffer';
	    //     // ws.send('i am ready to receive some data!');
	    //     console.log( e.data );
	    // });
    }
});

const services = createMonacoServices();

function createLanguageClient( connection: MessageConnection ): BaseLanguageClient
{
    return new BaseLanguageClient
    ( { name: "casm-lang.plugin.monaco"
      , clientOptions:
      { documentSelector: [ 'casm' ]
        , errorHandler:
        { error: () => ErrorAction.Continue
          , closed: () => CloseAction.DoNotRestart
        }
      }
      , services
      , connectionProvider:
        { get: (errorHandler, closeHandler) =>
          {
	          return Promise.resolve
              ( createConnection
                ( connection
                , errorHandler
                , closeHandler
                )
              );
          }
        }
      }
    );
}

//
//  Local variables:
//  mode: javascript
//  indent-tabs-mode: nil
//  c-basic-offset: 4
//  tab-width: 4
//  End:
//  vim:noexpandtab:sw=4:ts=4:
//
