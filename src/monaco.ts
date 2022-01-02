//
//  Copyright (C) 2016-2022 CASM Organization <https://casm-lang.org>
//  All rights reserved.
//
//  Developed by: Philipp Paulweber et al.
//                <https://github.com/casm-lang/casm-lang.plugin.monaco/graphs/contributors>
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

window.onload = () =>
{
    const w = <any>window;
    w.require
    ( [ 'vs/editor/editor.main' ]
    , () =>
      {
          require( './ts/languageclient' );
      }
    );
};

//
//  Local variables:
//  mode: javascript
//  indent-tabs-mode: nil
//  c-basic-offset: 4
//  tab-width: 4
//  End:
//  vim:noexpandtab:sw=4:ts=4:
//
