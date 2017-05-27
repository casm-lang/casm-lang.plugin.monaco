#
#   Copyright (c) 2017 CASM Organization
#   All rights reserved.
#
#   Developed by: Philipp Paulweber
#                 https://github.com/casm-lang/casm-lang.plugin.monaco
#
#   This file is part of casm-lang.plugin.monaco.
#
#   casm-lang.plugin.monaco is free software: you can redistribute it and/or modify
#   it under the terms of the GNU General Public License as published by
#   the Free Software Foundation, either version 3 of the License, or
#   (at your option) any later version.
#
#   casm-lang.plugin.monaco is distributed in the hope that it will be useful,
#   but WITHOUT ANY WARRANTY; without even the implied warranty of
#   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
#   GNU General Public License for more details.
#
#   You should have received a copy of the GNU General Public License
#   along with casm-lang.plugin.monaco. If not, see <http://www.gnu.org/licenses/>.
#
#
#   Copyright (c) 2017 TypeFox GmbH (http://www.typefox.io). All rights reserved.
#   Licensed under the MIT License. See License.txt in the project root for license information.
#
#
#   Copyright (c) Microsoft Corporation. All rights reserved.
#   Licensed under the MIT License. See License.txt in the project root for license information.
#

NPM = npm run

default: install compile build

install:
	npm $@

compile:
	$(NPM) $@

build:
	$(NPM) $@

clean:
	$(NPM) $@

clean-all:
	$(NPM) $@
