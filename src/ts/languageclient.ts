//
//  Copyright (C) 2016-2024 CASM Organization <https://casm-lang.org>
//  All rights reserved.
//
//  Developed by: Philipp Paulweber et al.
//  <https://github.com/casm-lang/casm-lang.plugin.monaco/graphs/contributors>
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

var w = <any>window;

import
{ listen
, MessageConnection
}
from 'vscode-ws-jsonrpc';

import
{ RequestType
}
from 'vscode-jsonrpc';

import
{ BaseLanguageClient
, CloseAction
, ErrorAction
, createMonacoServices
, createConnection
}
from 'monaco-languageclient';

import IMonarchLanguage = monaco.languages.IMonarchLanguage;


const ReconnectingWebSocket = require( 'reconnecting-websocket' );
// const GraphViz = require( 'viz.js/viz-lite' );
const jQuery = require( 'jquery' );

const value = `
// Hello World Example Specification
CASM

init hello_world /* single execution agent definition  */

function f : Integer -> Integer

/**
    docu for this hello world rule ;-)
*/
rule hello_world =
{
    println( "Hello world!" ) // 'println' is a built-in!

    let x = true in
        assert( x )

    forall i in [-10..10] do
        f(i) := i * i

    program( self ) := undef
}

`;

monaco.languages.register
( { id: 'casm'
  , extensions: [ '.casm' ]
  , aliases: [ 'CASM', 'casm' ]
  , mimetypes: [ 'text/plain' ]
  }
);


jQuery( "#casm-lang-plugin-monaco" ).append( '<div id="casm-lang-plugin-monaco-result"></div>' );


// const result = GraphViz( "digraph { a -> b; }" );
// jQuery( "#casm-lang-plugin-monaco" ).append( "<div>" + result + "</div>" );


w.model = monaco.editor.createModel
( value
, 'casm'
, monaco.Uri.parse( 'inmemory://model.casm' )
);

// https://microsoft.github.io/monaco-editor/monarch.html#htmlembed

monaco.editor.defineTheme
( 'casm'
  , { base: 'vs'
    , inherit: true
    , rules:
      [ { token: 'keyword'    , foreground: '0033ff', fontStyle: 'bold' }
      , { token: 'type'       , foreground: 'aa0000', fontStyle: ''     }
      , { token: 'entity'     , foreground: '000000', fontStyle: 'bold' }
      , { token: 'predefined' , foreground: '9900ff', fontStyle: ''     }
      , { token: 'operators'  , foreground: '000000', fontStyle: ''     }
      , { token: 'constant'   , foreground: '0099ff', fontStyle: ''     }
      , { token: 'number'     , foreground: '000000', fontStyle: ''     }
      , { token: 'string'     , foreground: '009900', fontStyle: ''     }
      , { token: 'comment'    , foreground: '660000', fontStyle: ''     }
      , { token: 'comment.doc', foreground: '660000', fontStyle: 'bold' }
      ]
    , colors: { colorId: "casm" }
    }
);

monaco.editor.defineTheme
( 'casm-dark'
  , { base: 'vs-dark'
    , inherit: true
    , rules:
      [ { token: 'keyword'    , foreground: '33ccff', fontStyle: 'bold' }
      , { token: 'type'       , foreground: 'ffbb33', fontStyle: ''     }
      , { token: 'entity'     , foreground: 'ffffff', fontStyle: 'bold' }
      , { token: 'predefined' , foreground: 'ff33bb', fontStyle: ''     }
      , { token: 'operators'  , foreground: 'ffffff', fontStyle: ''     }
      , { token: 'constant'   , foreground: '33ffaa', fontStyle: ''     }
      , { token: 'number'     , foreground: 'ffffff', fontStyle: ''     }
      , { token: 'string'     , foreground: '2ff244', fontStyle: ''     }
      , { token: 'comment'    , foreground: 'bb2222', fontStyle: ''     }
      , { token: 'comment.doc', foreground: 'bb2222', fontStyle: 'bold' }
      ]
    , colors: { colorId: "casm-dark" }
    }
);

w.editor = monaco.editor.create
( document.getElementById( "casm-lang-plugin-monaco-editor" )!
  , { model: w.model
      , scrollBeyondLastLine: false
      , roundedSelection: true
      , lineNumbers: "on"
      , theme: "casm-dark"
      // , theme: "vs-dark"
      , fontSize: 12
      //, fontFamily: "Andale Mono"
  }
);



function createUrl( path: string ): string
{
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';

    var casmd = w.casmd;
    if( typeof casmd !== 'undefined' && casmd !== null )
    {
        var flag = casmd.standalone;
        if( typeof flag !== 'undefined' && flag !== null && flag == true )
        {
            return `${protocol}://127.0.0.1:8010`;
        }
    }

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


const url = createUrl( '/_casmd' );

const webSocket = createWebSocket( url );

// flag = false;

listen
( { webSocket
  , onConnection: connection =>
    {
        const languageClient = createLanguageClient( connection );
        const disposable = languageClient.start();
        connection.onClose( () =>
        {
	        // flag = false;
	        disposable.dispose();
	    });


        var language = <IMonarchLanguage>
            { defaultToken: 'invalid'
            , tokenPostfix: '.casm'

            , brackets:
              [ { token: 'delimiter.curly'
                , open:  '{'
                , close: '}'
                }
              , { token: 'delimiter.curly'
                , open: '{|'
                , close: '|}'
                }
              , { token: 'delimiter.parenthesis'
                , open: '('
                , close: ')'
                }
              , { token: 'delimiter.square'
                , open: '['
                , close: ']'
                }
              , { token: 'delimiter.angle'
                , open: '<'
                , close: '>'
                }
              ]

            , keywords:
              [ 'CASM'
              , 'init'
              , 'function'
              , 'initially'
              , 'symbolic'
              , 'defined'
              , 'derived'
              , 'enumeration'
              , 'using'
              , 'import'
              , 'export'
              , 'invariant'
              , 'structure'
              , 'behavior'
              , 'implement'
              , 'operator'
              , 'for'
              , 'this'
              , 'type'
              , 'rule'
              , 'skip'
              , 'let'
              , 'in'
              , 'case'
              , 'of'
              , 'as'
              , 'default'
              , '_'
              , 'if'
              , 'then'
              , 'else'
              , 'par'
              , 'endpar'
              , 'seq'
              , 'endseq'
              , 'self'
              , 'iterate'
              , 'forall'
              , 'do'
              , 'holds'
              , 'exists'
              , 'with'
              , 'call'
              , 'choose'
              ]

            , constants:
              [ 'self'
              , 'this'
              , 'undef'
              , 'false'
              , 'true'
              ]

            , builtins:
              [ 'assert'
              , 'print'
              , 'println'
              ]

            , types:
              [ 'Void'
              , 'Object'
              , 'Boolean'
              , 'Binary'
              , 'Integer'
              , 'Decimal'
              , 'Rational'
              , 'String'
              , 'Range'
              , 'Tuple'
              , 'List'
              ]

            , functions:
              [ 'program'
              , 'result'
              ]

            , operators:
              [ ':='
              , '>'
              , '<'
              , '='
              , '!='
              , '<='
              , '>='
              , 'not'
              , 'and'
              , 'or'
              , 'xor'
              , '+'
              , '-'
              , '*'
              , '%'
              , '/'
              , '^'
              , 'inverse'
              , 'implies'
              , '..'
              , 'as'
              ]

            // we include these common regular expressions
            , symbols: /[=><!~?:&|+\-*\/\^%]+/
            , escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/
            , integersuffix: /(ll|LL|u|U|l|L)?(ll|LL|u|U|l|L)?/
            , floatsuffix: /[fFlL]?/

            // The main tokenizer for our languages
            , tokenizer:
              { root:
                [ // identifiers and keywords
                  [ /[a-zA-Z_]\w*/
                  , { cases:
                      { '@keywords': {token:'keyword.$0'}
                      , '@constants': 'constant'
                      , '@builtins': 'predefined'
                      , '@types': 'type'
                      , '@functions': 'entity'
                      , '@default': 'identifier'
                      }
                    }
                  ]
                , // whitespace
                  { include: '@whitespace' }

                    // [[ attributes ]].
                  , [/\[\[.*\]\]/, 'annotation'],

                    // Preprocessor directive
                    [/^\s*#\w+/, 'keyword'],

                    // delimiters and operators
                    [/[{}()\[\]]/, '@brackets'],
                    [/[<>](?!@symbols)/, '@brackets'],
                    [/@symbols/, { cases: { '@operators': 'delimiter',
                                            '@default'  : '' } } ],

                    // numbers
                    [/\d*\d+[eE]([\-+]?\d+)?(@floatsuffix)/, 'number.float'],
                    [/\d*\.\d+([eE][\-+]?\d+)?(@floatsuffix)/, 'number.float'],
                    [/0[xX][0-9a-fA-F']*[0-9a-fA-F](@integersuffix)/, 'number.hex'],
                    [/0[0-7']*[0-7](@integersuffix)/, 'number.octal'],
                    [/0[bB][0-1']*[0-1](@integersuffix)/, 'number.binary'],
                    [/\d[\d']*\d(@integersuffix)/, 'number'],
                    [/\d(@integersuffix)/, 'number'],

                    // delimiter: after number because of .\d floats
                    [/[;,.]/, 'delimiter'],

                    // strings
                    [/"([^"\\]|\\.)*$/, 'string.invalid' ],  // non-teminated string
                    [/"/,  'string', '@string' ],

                    // characters
                    [/'[^\\']'/, 'string'],
                    [/(')(@escapes)(')/, ['string','string.escape','string']],
                    [/'/, 'string.invalid']
                ],

                whitespace: [
                    [/[ \t\r\n]+/, ''],
                    [/\/\*\*(?!\/)/,  'comment.doc', '@doccomment' ],
                    [/\/\*/,       'comment', '@comment' ],
                    [/\/\/.*$/,    'comment'],
                ],

                comment: [
                    [/[^\/*]+/, 'comment' ],
                    [/\*\//,    'comment', '@pop'  ],
                    [/[\/*]/,   'comment' ]
                ],
                //Identical copy of comment above, except for the addition of .doc
                doccomment: [
                    [/[^\/*]+/, 'comment.doc' ],
                    [/\*\//,    'comment.doc', '@pop'  ],
                    [/[\/*]/,   'comment.doc' ]
                ],

                string: [
                    [/[^\\"]+/,  'string'],
                    [/@escapes/, 'string.escape'],
                    [/\\./,      'string.escape.invalid'],
                    [/"/,        'string', '@pop' ]
                ],
            },
        };


// const syntax = `
// PPA: add config here
// `;

        // var def = null;
        try
        {
            // def = eval( "(function(){ return " + syntax + "; })()" );
            // monaco.languages.setMonarchTokensProvider( 'casm', def );
            monaco.languages.setMonarchTokensProvider( 'casm', language );
        }
        catch (err)
        {
            console.error( "could not set CASM language model" );
            console.error( err );
            return;
        }

	    // flag = true;

	    w.editor.addAction
	    ( { id: 'casmd-version'
	      , label: 'casmd: display version information'
	      , keybindings: [ monaco.KeyMod.CtrlCmd, monaco.KeyCode.F2 ]
	      , keybindingContext: null
	      , contextMenuGroupId: 'navigation'
	      , contextMenuOrder: 1.5
	      , run: () =>
            {
                const params = { 'command' : 'version' };
                const request = 'workspace/executeCommand';
                const request_type = new RequestType( request )

                w.client.sendRequest( request_type, params ).then
                ( ( result : any ) =>
                  {
                      console.log( "RESULT F2: " + request )
                      console.log( params )
                      console.log( result )
                  }
                  , (error : any) =>
                  {
                      console.log( "ERROR F2: " + request )
                      console.log( params )
                      console.log( error )
                  }
                );

	            return null;
	        }
	      }
	    );

	    w.editor.addAction
	    ( { id: 'casmd-run'
	      , label: 'casmd: execute the specification'
	      , keybindings: [ monaco.KeyMod.CtrlCmd, monaco.KeyCode.F4 ]
	      , keybindingContext: null
	      , contextMenuGroupId: 'navigation'
	      , contextMenuOrder: 1.5
	      , run: () =>
            {
                const params = { 'command' : 'run' };
                const request = 'workspace/executeCommand';
                const request_type = new RequestType( request )

                w.client.sendRequest( request_type, params ).then
                ( ( result : any ) =>
                  {
                      console.log( "RESULT F4: " + request )
                      console.log( params )
                      console.log( result )

                      const currentDateTime = new Date().toLocaleString( 'en-GB' );

                      jQuery( '.casm-lang-plugin-monaco-result-message' ).removeClass( 'bs-callout-primary' );

                      jQuery( "#casm-lang-plugin-monaco-result" ).prepend
                      ( '<div title="'
                        + currentDateTime
                        + '" class="casm-lang-plugin-monaco-result-message bs-wrap bs-callout bs-callout-primary">'
                        + '<h4>' + currentDateTime + '</h4>'
                        + '<pre>'
                        + result
                        + '</pre>'
                        + '</div>'
                      );
                  }
                  , (error : any) =>
                  {
                      console.log( "ERROR F4: " + request )
                      console.log( params )
                      console.log( error )
                  }
                );

	            return null;
	        }
	      }
	    );

	    w.editor.addAction
	    ( { id: 'casmd-trace'
	      , label: 'casmd: generate TPTP trace'
	      , keybindings: [ monaco.KeyMod.CtrlCmd, monaco.KeyCode.F3 ]
	      , keybindingContext: null
	      , contextMenuGroupId: 'navigation'
	      , contextMenuOrder: 1.5
	      , run: () =>
            {
                const params = { 'command' : 'trace' };
                const request = 'workspace/executeCommand';
                const request_type = new RequestType( request )

                w.client.sendRequest( request_type, params ).then
                ( ( result : any ) =>
                  {
                      console.log( "RESULT F3: " + request )
                      console.log( params )
                      console.log( result )

                      const currentDateTime = new Date().toLocaleString( 'en-GB' );

                      jQuery( '.casm-lang-plugin-monaco-result-message' ).removeClass( 'bs-callout-primary' );

                      jQuery( "#casm-lang-plugin-monaco-result" ).prepend
                      ( '<div title="'
                        + currentDateTime
                        + '" class="casm-lang-plugin-monaco-result-message bs-wrap bs-callout bs-callout-primary">'
                        + '<h4>' + currentDateTime + '</h4>'
                        + '<pre>'
                        + result
                        + '</pre>'
                        + '</div>'
                      );
                  }
                  , (error : any) =>
                  {
                      console.log( "ERROR F3: " + request )
                      console.log( params )
                      console.log( error )
                  }
                );

	            return null;
	        }
	      }
	    );

	    // w.editor.addAction
	    // ( { id: 'casmd-TEST'
	    //   , label: 'casmd: TEST'
	    //   , keybindings: [ monaco.KeyMod.CtrlCmd, monaco.KeyCode.F6 ]
	    //   , keybindingContext: null
	    //   , contextMenuGroupId: 'navigation'
	    //   , contextMenuOrder: 1.5
	    //   , run: () =>
        //     {
        //         console.log( w.editor.setModelMarkers )
        //
	    //         return null;
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

// // w.editor._setModelMarkers = w.editor.setModelMarkers;
// w.editor.setModelMarkers = function( model : any, owner : any, markers : any )
// {
//     // w.editor._setModelMarkers( w.editor, model, owner, markers );
//
//     console.log( model );
//     console.log( owner );
//     console.log( markers );
// }


const services = createMonacoServices();

function createLanguageClient( connection: MessageConnection ): BaseLanguageClient
{
    w.client = new BaseLanguageClient
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

    return w.client;
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
