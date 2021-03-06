
/**
 * BBData
 * 
 * Method to hold data (one object).
 * All functionality use the path to properties of data.
 * Supports binding to dom-elements and observation of data-modifications.
 * Bindings act as a glue between a piece of data and the user interface. 
 * A change in one will be reflected in the other.
 *
 * To create an instance of BBData: var myData = new BBData({ some: data })
 * 
 * Bindings: Several attributes of any dom-elements may be bound to any data.
 * Supports one or two-way bindings. 
 * - One way: User interface reflects data. UI cannot modify data.
 * - Two ways: UI reflects data. UI can modify data.
 * 
 * Example: A select-element can bind the option-elements to an array and the selected option to a string.
 * Example: A title-tag can bind its content (innerHTML) to a string. Whenever this string is changed
 * the title-tag will reflect the new value.
 * Example: A text-input can bind its value to a string using a two-way binding. If the input-field is modified the data will change.
 * If the data is modified the input field will update to the new value.
 * 
 * To get all bindings run getBindings() on the instance of BBData.
 * 
 * Observables: Any number of methods may be registered for any data.
 * - Any time observed data is modified the observer will be notified.
 * - The observer reseives a notification-object containing the path and new value of the data.
 * - The path "null" is used to observe the main data-object (data passed as the argument to BBData).
 *
 * To get all observables run getObservables() on the instance of BBData.
 *
 * Both bindings and observables require that the setter of BBData is used when modifying data:
 * instance.set(path, value)
 *
 * Contact:
 * info@bitboks.no
 * http://www.bitboks.no/sourcecode/bbdata
 * 
 */

function BBData(data) {

    var self = {
        data: data,
        bindings: {},
        observables: {},

        /**
         * Get member of object by dot-notated string
         * @param  {string} key    The key to get from the object. Support dot-notation
         * @param  {boolean} allowUndefined If set to true return undefined if member do not exist. Can be used to check if sometning actually exist.
         * @return {mixed}         The value from the query or null
         */
        get: function(key, allowUndefined) {
            if (!key) return self.data;
            var callback = function(value, index) {
                return value && (typeof(value[index]) !== "undefined") ? value[index] : (allowUndefined ? undefined : null);
            };
            return key.split('.').reduce(callback, self.data);
        },

        /**
         * Set a value to an object
         * @param {string} path  Path for value. Support dot-notation (a.b)
         * @param {mixed}  value The value to set
         * @param {dom-element}  element (optional) Element to pass on to the observers
         * @return {string}      The modified path (May differ from supplied path for arrays)
         */
        set: function(path, value, element) {
            // Check if new value is identical to current value.
            // Only works for simple data-types. Objects, functions etc will not be catched here.
            if (self.get(path) === value) {
                return;
            }
            var modifiedPath = path;
            path.split(".").reduce(function (prev, cur, idx, arr) {
                var isLast = (idx === arr.length - 1);
                if (isLast) {
                    if (Array.isArray(prev)) {
                        var index = parseInt(cur, 10);
                        if (index > prev.length) {
                            cur = prev.length;
                        } else if (index < 0) {
                            cur = 0;
                        }
                        // Path may have changed (for arrays). Send notification for actual modified path:
                        var parentPath = self.getParentPath(path);
                        modifiedPath = (parentPath ? parentPath + '.' : '') + cur;
                    }
                    var isNew = typeof(prev[cur]) == 'undefined';
                    prev[cur] = value;
                    self.notify(modifiedPath, value, (isNew ? 'create' : 'update'), element);
                    return;
                }
                return (self.isObject(prev[cur])) ? prev[cur] : (prev[cur] = {});
            }, self.data);
            return modifiedPath;
        },

        /**
         * Change path (move)
         * @param  {string} fromPath Path of content to move
         * @param  {string} toPath   New path
         * @return {string}          The modified path (May differ from supplied path for arrays)
         */
        move: function(fromPath, toPath) {
            if (fromPath == toPath) return;
            if (self.isInArray(toPath)) {
                return self.moveInArray(fromPath, toPath);
            } else {
                return self.moveInObject(fromPath, toPath);
            }
        },

        /**
         * Move data to new path in object
         * @param  {string} fromPath Path to move from
         * @param  {string} toPath   Path to move to
         * @return {string}          The modified path (May differ from supplied path for arrays)
         */
        moveInObject: function(fromPath, toPath) {
            var value = self.get(fromPath);
            self.delete(fromPath);
            return self.set(toPath, value);            
        },

        /**
         * Move data to new path in array
         * @param  {string} fromPath Path to move from
         * @param  {string} toPath   Path to move to
         * @return {string}          The modified path
         */
        moveInArray: function(fromPath, toPath) {
            var value = self.get(fromPath);
            self.delete(fromPath);
            var modifiedPath;
            toPath.split(".").reduce(function (prev, cur, idx, arr) {
                var isLast = (idx === arr.length - 1);
                if (isLast) {
                    var index = parseInt(cur, 10);
                    if (isNaN(index)) index = 0;
                    if (index > prev.length) {
                        index = prev.length;
                    }
                    prev.splice(index, 0, value);
                    var parentPath = self.getParentPath(toPath);
                    modifiedPath = (parentPath ? parentPath + '.' : '') + index;
                    self.notify(modifiedPath, value, 'create', null);
                    return;
                }
                return (self.isObject(prev[cur])) ? prev[cur] : (prev[cur] = {});
            }, self.data); 
            return modifiedPath;      
        },

        /**
         * Remove data at path
         * Bindings and observables are also removed for path
         * @param  {string} path The path to delete
         * @return {void}
         */
        delete: function(path) {
            path.split(".").reduce(function (prev, cur, idx, arr) {
                var isLast = (idx === arr.length - 1);
                if (isLast) {
                    self.unbindAll(path);
                    self.unobserve(path);
                    if (Array.isArray(prev)) {
                        prev.splice(cur, 1);
                    } else {
                        delete prev[cur];
                    }
                    self.notify(path, null, 'delete', null);
                    return;
                }
                return (self.isObject(prev[cur])) ? prev[cur] : (prev[cur] = {});
            }, self.data);
        },

        /**
         * Check if argument is an object
         * @return {Boolean}
         */
        isObject: function(potentionalObject) {
            return typeof(potentionalObject) === "object" && potentionalObject !== null;
        },
    
        /**
         * Check if argument is an array
         * @return {Boolean}
         */
        isArray: function(potentionalArray) {
            if (typeof Array.isArray === 'undefined') {
                return Object.prototype.toString.call( potentionalArray ) === '[object Array]';
            } else{
                return Array.isArray(potentionalArray);
            }
        },

        /**
         * Get value for parent path
         * @param  {string} path Current path
         * @return {mixed}       The "parent" value
         */
        getParentValue: function(path) {
            var parts = path.split(".");
            parts.pop();
            var parentPath = parts.join(".");
            if (!parentPath) parentPath = null; // Top-level element
            return self.get(parentPath);
        },

        getParentPath: function(path) {
            path = path.split('.');
            path.pop();
            return path.join('.');
        },

        /**
         * Check if value of "parent"-path is an array
         * @param  {string}  path The path
         * @return {Boolean}
         */
        isInArray: function(path) {
            var value = self.getParentValue(path);
            return self.isArray(value);
        },

        /**
         * Create a binding between data and a dom-element
         * @param  {element or HTMLCollection} domElement. If collection: Iterate elements and bind all of them.
         *                             Eks: getElementsByTagName returns a collection, getElementById returns one element.
         * @param  {string} path       Path to data. The value at this path is bound to the dom-element.
         * @param  {string} attribute  What attribut of the dom-element to bind.
         *                             - "value", "innerHTML", "disabled", "class" etc. Anything available using getAttribute().
         * @param  {object} options    Settings
         *                             - event (string): Name of event to bind (click, change etc). Default is "change"
         *                             - negateBoolean = true: Parse value as boolean and reverse. Only applies to one-way bindings.
         *                             - boolean = true: Parse value as boolean. Only applies to one-way bindings.
         *                             - booleanCondition (any): Parse value as boolean based on condition. Only applies to one-way bindings.
         *                                                       Eks: booleanCondition="a": Set to true if value of bound data is "a", false if not.
         *                             - negateBooleanCondition (any): Parse value as boolean based on condition and reverse. Only applies to one-way bindings.
         *                                                       Eks: booleanCondition="a": Set to false if value of bound data is "a", true if not.
         *                             - twoways = true: (default) Update both ways. Ie: Update user interface when data changes and update data when user interface changes.
         *                                               If false: Only update data from user interface.
         *                             - valueTransformer (object): Specify your own transformer. 
         *                                               Must support methods both ways for a twoway-binding: 
         *                                               - transformedValue - modify data to use in UI
         *                                               - reverseTransformedValue - modify value from UI and set as data.
         *                                               Passing the result of transformedValue to reverseTransformedValue should return
         *                                               the same value as the original data.
         * @return {void}
         */
        bind: function(domElement, path, attribute, options) {
            if (!domElement) {
                console.warn('BBData: Cannot bind path "' + path + '", no dom-element supplied.')
                return;
            }
            if (!(domElement instanceof HTMLElement)) {
                for (var i = 0; i < domElement.length; i++) {
                    if (domElement[i] instanceof HTMLElement) {
                        self.bind(domElement[i], path, attribute, options);
                    }
                }
                return;
            }

            if (!domElement) return;
            if (!attribute) attribute = "value";
            if (!options) options = {};
            if (typeof(options.twoways) == "undefined") options.twoways = true;
            if (typeof(options.event) == "undefined") options.event = "change";
            if (!self.bindings[path]) self.bindings[path] = {};
            if (!self.bindings[path][attribute]) self.bindings[path][attribute] = [];
            var binding = {
                element: domElement,
                options: options,
                handler: function(e) {
                    if (!options.twoways) {
                        e.preventDefault();
                        return;
                    }
                    self.domChange(e, path, attribute);
                }
            };
            self.bindings[path][attribute].push(binding);
            domElement.addEventListener(binding.options.event, binding.handler, false);
            self.updateBoundElementsForPathAndAttribute(path, attribute, self.get(path));
        },

        /**
         * Remove a binding between data and a dom-element
         * Arguments: See method "bind".
         */
        unbind: function(domElement, path, attribute) {
            if (!self.bindings[path]) return;
            if (!(domElement instanceof HTMLElement)) {
                for (var i = 0; i < domElement.length; i++) {
                    if (domElement[i] instanceof HTMLElement) {
                        self.unbind(domElement[i], path, attribute);
                    }
                }
                return;
            }
            if (!attribute) attribute = "value";
            if (!self.bindings[path][attribute]) return;
            for (var i = 0; i < self.bindings[path][attribute].length; i++) {
                var binding = self.bindings[path][attribute][i];
                if (domElement === binding.element) {
                    domElement.removeEventListener(binding.options.event, binding.handler, false);
                    self.bindings[path][attribute].splice(i, 1);
                }
            }
        },

        /**
         * Remove bindings
         * @param  {string} optionalPath Only remove matching paths. If not set all is removed
         * @return {void}
         */
        unbindAll: function(optionalPath) {
            // Example: optionalPath = "user" will remove path "user.a", "user_something", "user" ...
            optionalPath = optionalPath || "";
            for (var path in self.bindings) {
                if (path.indexOf(optionalPath) == 0) {
                    for (var attribute in self.bindings[path]) {
                        self.bindings[path][attribute].forEach(function(binding) {
                            binding.element.removeEventListener(binding.options.event, binding.handler, false);
                        });
                        delete self.bindings[path][attribute];
                    }
                    delete self.bindings[path];
                }
            }
        },

        /**
         * Data has changed, notify observers of path and parent path(s)
         * and update bound user-interface
         * @param  {string}      path       The modified path
         * @param  {mixed}       value      Value at path
         * @param  {string}      action     Type of modification: create, delete, update
         * @param  {dom-element} element    (optional) Dom-element bound to data at path
         * @return {void}
         */
        notify: function(path, value, action, element) {
            self.updateBoundElementsForPath(path, value);
            self.updateBoundElementsAtPath(path, value);
            if (self.observables[path]) {
                self.notifyObserversForPath(path, value, path, action, element);
            }
            self.notifyObserversFromPath(path, action, element);
        },

        /**
         * Handler for changes to bound dom-elements. 
         * Update bound data based on value of the dom-element
         * @param  {event} e
         * @return {void}
         */
        domChange: function(e, path, attribute) {
            if (!self.bindings[path]) return;
            if (!self.bindings[path][attribute]) return;
            for (var i = 0; i < self.bindings[path][attribute].length; i++) {
                var binding = self.bindings[path][attribute][i];
                if (e.target === binding.element) {
                    var value = binding.element[attribute];
                    if (binding.options.valueTransformer) {
                        value = binding.options.valueTransformer.reverseTransformedValue(value, binding.element);
                    }
                    self.set(path, value, binding.element);
                }
            }
        },

        /**
         * Reflect change in data on all bound dom-elements for path
         * @param  {string} path
         * @param  {mixed} value
         * @return {void}
         */
        updateBoundElementsForPath: function(path, value) {
            if (!self.bindings[path]) {
                return;
            }
            for (var attribute in self.bindings[path]) {
                self.updateBoundElementsForPathAndAttribute(path, attribute, value);
            }
        },

        /**
         * A path is changed. Notify observers of children of the path (if exist).
         * Eks: path "a.b" is changed. Notify observers of "a.b.c" and others.
         * @param  {string} path Path of changed data
         * @return {void}
         */
        updateBoundElementsAtPath: function(path, value) {
            if (!self.isObject(value)) {
                return;
            }
            for (key in value) {
                self.updateBoundElementsAtPathRecursivly(path + "." + key, value[key]);
            }

        },

        /** See updateBoundElementsAtPath */
        updateBoundElementsAtPathRecursivly: function(path, value) {
            if (self.bindings[path]) {
                for (var attribute in self.bindings[path]) {
                    self.updateBoundElementsForPathAndAttribute(path, attribute, value);
                }
            }
            if (self.isObject(value)) {
                for (key in value) {
                    self.updateBoundElementsAtPathRecursivly(path + "." + key, value[key]);
                }
            }
        },

        /**
         * Reflect change in data on bound dom-elements
         * @param  {string} path
         * @param  {mixed} value
         * @return {void}
         */
        updateBoundElementsForPathAndAttribute: function(path, attribute, value) {
            if (!self.bindings[path]) {
                return;
            }
            if (!self.bindings[path][attribute]) {
                return;
            }

            for (var i = 0; i < self.bindings[path][attribute].length; i++) {
                var element = self.bindings[path][attribute][i].element;
                var options = self.bindings[path][attribute][i].options;

                var modifiedValue = value;

                if (options.valueTransformer) {
                    modifiedValue = options.valueTransformer.transformedValue(modifiedValue, element);
                } else if (options.boolean) {
                    modifiedValue = value ? true : false;
                } else if (options.negateBoolean) {
                    modifiedValue = value ? false : true;
                } else if (options.booleanCondition) {
                    modifiedValue = value == options.booleanCondition ? true : false;
                } else if (options.negateBooleanCondition) {
                    modifiedValue = value == options.negateBooleanCondition ? false : true;
                }

                if (element.tagName == "SELECT" && attribute == "option") {
                    if (self.isArray(modifiedValue)) {
                        element.innerHTML = "";
                        for (var ii = 0; ii < modifiedValue.length; ii++) {
                            var optionEl = document.createElement("option");
                            var optionValue = modifiedValue[ii];
                            // Object with properties or string used as both value and text (innerHTML)
                            if (self.isObject(optionValue)) {
                                for (var property in optionValue) {
                                    optionEl[property] = optionValue[property];
                                }
                            } else {
                                optionEl.value = optionValue;
                                optionEl.innerHTML = optionValue;
                            }
                            element.appendChild(optionEl);
                        }
                    } else {
                        console.warn('Bound value path "' + path + '" is not an array. Cannot create option-elements for select-element.');
                    }
                    for (var ii = 0; ii < element.options.length; ii++) {
                        if (element.options[ii].value == modifiedValue) {
                            element.options[ii].selected = "selected";
                        } else {
                            element.options[ii].removeAttribute("selected");
                        }
                    }
                    continue;
                }

                // The values "true" and "false" are not allowed on boolean attributes. To represent a false value, the attribute has to be omitted altogether.
                if (self.isBooleanAttribute(attribute)) {
                    if (modifiedValue) {
                        modifiedValue = attribute;
                    } else {
                        if (self.isProperty(attribute, element)) {
                            element[attribute] = modifiedValue;
                        }
                        element.removeAttribute(attribute);
                        continue;
                    }
                }

                /**
                 * Note:
                 * Using setAttribute() to modify certain attributes, most notably value in XUL, works inconsistently, as the attribute specifies the default value. 
                 * To access or modify the current values, you should use the properties. For example, use elt.value instead of elt.setAttribute('value', val).
                 * https://developer.mozilla.org/en-US/docs/Web/API/Element/setAttribute
                 */
                if (self.isProperty(attribute, element)) {
                    element[attribute] = modifiedValue;
                } else {
                    element.setAttribute(attribute, modifiedValue);
                }
            }
        },

        /**
         * Is this attribute a boolean dom-attribute?
         * Boolean attrrbutes can be printed without values: <p disabled></p> instead of <p disabled="disabled"></p>
         * The off/false-value must be set by omiting the attribute altogether (disabled=false will not do)
         * @param  {string}  attribute Attribute-name
         * @return {Boolean}
         */
        isBooleanAttribute: function(attribute) {
            var booleans = [
                "allowfullscreen", 
                "async",
                "autofocus",
                "checked",
                "compact",
                "contenteditable",
                "declare",
                "default",
                "defer",
                "disabled",
                "formnovalidate",
                "hidden",
                "inert",
                "ismap",
                "itemscope",
                "multiple",
                "muted",
                "nohref",
                "noresize",
                "noshade",
                "novalidate",
                "nowrap",
                "open",
                "readonly",
                "required",
                "reversed",
                "seamless",
                "selected",
                "sortable",
                "spellcheck",
                "truespeed",
                "typemustmatch"
            ];
            return booleans.indexOf(attribute) > -1;
        },

        /**
         * Is this attribute a property on the dom-element?
         * @param  {string}  attribute Attribute-name
         * @param  {dom-element}  element   The element to check for the attribute
         * @return {Boolean}
         */
        isProperty: function(attribute, element) {
            return typeof(element[attribute]) !== "undefined";
        },

        /**
         * Register an observer for a path
         * @param  {string}   path     Path to data
         * @param  {Function} callback The method to send a notification to
         * @param  {any} context (optional) Instance registering the observation
         * @return {void}
         */
        observe: function(path, callback, context) {
            if (!path) path = null; // Main data
            if (!self.observables[path]) self.observables[path] = [];
            self.observables[path].push({
                callback: callback,
                context: context ? context : null
            });
        },

        /**
         * Remove observers for path
         * Note: Any path may have several observers.
         * This method removes all of them.
         * @param  {string} path The path to remove observers from
         * @return {void}
         */
        unobserve: function(path) {
            if (!self.observables[path]) return;
            self.observables[path].splice(0,self.observables[path].length)
        },

        /**
         * Remove all observers
         * @param  {string} optionalPath Optional path to limit removal on
         * @return {void}
         */
        unobserveAll: function(optionalPath) {
            // Example: optionalPath = "user" will remove path "user.a", "user_something", "user" ...
            optionalPath = optionalPath || "";
            for (var path in self.observables) {
                if (path.indexOf(optionalPath) == 0) {
                    self.unobserve(path);
                    delete self.observables[path];
                }
            }
        },

        /**
         * Clean up. Remove references to data and dom-elements
         * For applications that frequently creates new instances to replace old ones 
         * this method should be used to limit memory leaks
         * @return {void}
         */
        remove: function() {
            self.unobserveAll();
            self.unbindAll();
            self.data = null;
        },

        /**
         * Data is modified. Pass a notification-object to the observer.
         * @param  {string} path  Path of changed data
         * @param  {mixed}  value New value
         * @return {void}
         */
        notifyObserversForPath: function(path, value, changedPath, action, element) {
            if (!self.observables[path]) {
                return;
            }
            for (var i = 0; i < self.observables[path].length; i++) {
                self.observables[path][i].callback({
                    path: path,
                    action: action,
                    changedPath: changedPath,
                    value: value,
                    element: element,
                    context: self.observables[path][i].context
                });
            }
        },

        /**
         * A path is changed. Notify observers of parent-parts of the path.
         * Eks: path "a.b.c" is changed. Notify observers of "a.b" and "a".
         * @param  {string} path Path of changed data
         * @return {void}
         */
        notifyObserversFromPath: function(path, action, element) {
            var parts = path.split(".");
            parts.pop(); // Remove last element (the one that is changed.)
            while (parts.length > 0) {
                var currentPath = parts.join(".");
                if (self.observables[currentPath]) {
                    self.notifyObserversForPath(currentPath, self.get(currentPath), path, action, element);
                }
                parts.pop();
            }
            // Also trigger observables for path "", main data-object.
            self.notifyObserversForPath(null, self.get(""), path, action, element);
        },

    };

    /**
     * "public" methods:
     */
    
    return {

        get: function(path, allowUndefined) {
            return self.get(path, allowUndefined);
        },

        set: function(path, value, element) {
            return self.set(path, value, element);
        },

        move: function(fromPath, toPath) {
            return self.move(fromPath, toPath);
        },

        delete: function(path) {
            self.delete(path);
        },

        getData: function() {
            return self.data;
        },

        bind: function(domElement, path, attribute, options) {
            self.bind(domElement, path, attribute, options);
        },

        unbind: function(domElement, path, attribute) {
            self.unbind(domElement, path, attribute);
        },

        unbindAll: function(optionalPath) {
            self.unbindAll(optionalPath);
        },

        getBindings: function() {
            return self.bindings;
        },

        observe: function(path, callback, context) {
            self.observe(path, callback, context);
        },

        unobserve: function(path) {
            self.unobserve(path);
        },

        getObservables: function() {
            return self.observables;
        },

        remove: function() {
            self.remove();
        }
    }
};
