// Copyright (c) Microsoft.  All rights reserved.
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation
// files (the "Software"), to deal  in the Software without restriction, including without limitation the rights  to use, copy,
// modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the
// Software is furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR  IMPLIED, INCLUDING BUT NOT LIMITED TO THE
// WARRANTIES OF MERCHANTABILITY,  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
// COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
// ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

///
/// Core.js
///

(function (global, undefined)
{

    function extend(target, members) {
        for (var member in members) {
            target[member] = members[member];
        }
    }

    function defineNamespace(name) {
        var names = name.split(".");
        var current = global;
        for (var i = 0; i < names.length; i++) {
            var ns = current[names[i]];
            if (!ns || typeof ns !== "object") {
                current[names[i]] = ns = {};
            }
            current = ns;
        }
        return current;
    }

    function defineClass(ctor, instanceMembers, classMembers) {
        ctor = ctor || function () { };
        if (instanceMembers) {
            extend(ctor.prototype, instanceMembers);
        }
        if (classMembers) {
            extend(ctor, classMembers);
        }
        return ctor;
    }

    function deriveClass(basePrototype, ctor, instanceMembers) {
        var prototype = {};
        extend(prototype, basePrototype);
        extend(prototype, instanceMembers);  // Will override like-named members on basePrototype.

        ctor = ctor || function () { };
        ctor.prototype = prototype;
        ctor.prototype.constructor = ctor;
        return ctor;
    }

    function classof(o) {
        if (o === null) {
            return "null";
        }
        if (o === undefined) {
            return "undefined";
        }
        return Object.prototype.toString.call(o).slice(8, -1).toLowerCase();
    }

    function isArray(o) {
        return classof(o) === "array";
    }

    function isObject(o) {
        return classof(o) === "object";
    }

    function isDate(o) {
        return classof(o) === "date";
    }

    function isFunction(o) {
        return classof(o) === "function";
    }

    function isGuid(value) {
        return (typeof value === "string") && /[a-fA-F\d]{8}-(?:[a-fA-F\d]{4}-){3}[a-fA-F\d]{12}/.test(value);
    }

    var hasOwnProperty = Object.prototype.hasOwnProperty;
    function isEmpty(obj) {
        if (obj === null || obj === undefined) {
            return true;
        }
        for (var key in obj) {
            if (hasOwnProperty.call(obj, key)) {
                return false;
            }
        }
        return true;
    }

    var idCounter = 0;
    function uniqueId(prefix) {
        /// <summary>Generates a unique id (unique within the entire client session)</summary>
        /// <param name="prefix" type="String">Optional prefix to the id</param>
        /// <returns type="String" />
        prefix || (prefix = "");
        return prefix + idCounter++;
    }

    function cache(object, key, value) {
        if (!object) {
            return;
        }
        if (arguments.length === 2) {
            // read
            var cacheName = upshot.cacheName;
            if (cacheName && object[cacheName]) {
                return object[cacheName][key];
            }
            return null;
        } else {
            // write
            if (object.nodeType !== undefined) {
                throw "upshot.cache cannot be used with DOM elements";
            }
            var cacheName = upshot.cacheName || (upshot.cacheName = uniqueId("__upshot__"));
            object[cacheName] || (object[cacheName] = function () { });
            return object[cacheName][key] = value;
        }
    }

    function deleteCache(object, key) {
        var cacheName = upshot.cacheName;
        if (cacheName && object && object[cacheName]) {
            if (key) {
                delete object[cacheName][key];
            }
            if (!key || isEmpty(object[cacheName])) {
                delete object[cacheName];
            }
        }
    }

    function sameArrayContents(array1, array2) {
        if (array1.length !== array2.length) {
            return false;
        } else {
            for (var i = 0; i < array1.length; i++) {
                if (array1[i] !== array2[i]) {
                    return false;
                }
            }
        }
        return true;
    }

    // This routine provides an equivalent of array.push(item) missing from JavaScript array.
    function arrayRemove(array, item) {
        var callback = upshot.isFunction(item) ? item : undefined;
        for (var index = 0; index < array.length; index++) {
            if (callback ? callback(array[index]) : (array[index] === item)) {
                array.splice(index, 1);
                return index;
            }
        }
        return -1;
    }

    // pre-defined ns
    var upshot = defineNamespace("upshot");

    // pre-defined routines
    upshot.defineNamespace = defineNamespace;
    upshot.defineClass = defineClass;
    upshot.deriveClass = deriveClass;
    upshot.classof = classof;
    upshot.isArray = isArray;
    upshot.isObject = isObject;
    upshot.isDate = isDate;
    upshot.isFunction = isFunction;
    upshot.isGuid = isGuid;
    upshot.uniqueId = uniqueId;
    upshot.cacheName = null;
    upshot.cache = cache;
    upshot.deleteCache = deleteCache;
    upshot.sameArrayContents = sameArrayContents;
    upshot.arrayRemove = arrayRemove;

    upshot.EntityState = {
        Unmodified: "Unmodified",
        ClientUpdated: "ClientUpdated",
        ClientAdded: "ClientAdded",
        ClientDeleted: "ClientDeleted",
        ServerUpdating: "ServerUpdating",
        ServerAdding: "ServerAdding",
        ServerDeleting: "ServerDeleting",
        Deleted: "Deleted",

        isClientModified: function (entityState) {
            return entityState && entityState.indexOf("Client") === 0;
        },
        isServerSyncing: function (entityState) {
            return entityState && entityState.indexOf("Server") === 0;
        }
    };

    ///#DEBUG
    upshot.assert = function (cond, msg) {
        if (!cond) {
            alert(msg || "assert is encountered!");
        }
    }
    ///#ENDDEBUG

    var entitySources = [];
    function registerRootEntitySource (entitySource) {
        entitySources.push(entitySource);
    }

    function deregisterRootEntitySource (entitySource) {
        entitySources.splice($.inArray(entitySource, entitySources), 1);
    }

    var recomputeInProgress;
    function triggerRecompute () {
        if (recomputeInProgress) {
            throw "Cannot make observable edits from within an event callback.";
        }

        try {
            recomputeInProgress = true;

            var sources = entitySources.slice();
            $.each(sources, function (index, source) {
                source.__recomputeDependentViews();
            });

            $.each(sources, function (index, source) {
                if (source.__flushEntityStateChangedEvents) {
                    source.__flushEntityStateChangedEvents();
                }
            });
        }
        finally {
            recomputeInProgress = false;
        }
    }

    function beginChange () {
        if (recomputeInProgress) {
            throw "Cannot make observable edits from within an event callback.";
        }
    }

    function endChange () {
        triggerRecompute();
    }

    upshot.__registerRootEntitySource = registerRootEntitySource;
    upshot.__deregisterRootEntitySource = deregisterRootEntitySource;
    upshot.__triggerRecompute = triggerRecompute;
    upshot.__beginChange = beginChange;
    upshot.__endChange = endChange;
}
)(this);

///
/// Observability.js
///

(function (global, $, upshot, undefined)
{
    var observability = upshot.observability = upshot.observability || {};

    $.each(["track", "insert", "remove", "refresh", "isProperty", "getProperty", "setProperty", "isArray", "createCollection", "asArray", "map", "unmap", "setContextProperty"], function (index, value) {
        observability[value] = function () {
            // NOTE: observability.configuration is expected to be established by a loaded Compat.<platform>.js.
            // TODO: Support apps and UI libraries that have no observability design.
            var config = observability.configuration;
            return config[value].apply(config, arguments);
        };
    });

    upshot.map = function (data, entityType, target) {
        // Interestingly, we don't use a "mapNested" parameter here (as Upshot proper does).
        // As a consequence, apps that call upshot.map from a map function will not pick up custom
        // map functions for nested entities/objects.  They'd need to hand-code calls to custom map
        // functions (ctors) for nested objects from the parent map function.
        return observability.configuration.map(data, entityType, null, target);
    };

}
)(this, jQuery, upshot);
///
/// Metadata.js
///

(function (global, $, upshot, undefined)
{
    var obs = upshot.observability;

    var metadata = {};

    upshot.metadata = function (entityType) {
        if (arguments.length === 0) {
            return $.extend({}, metadata);
        } else if (typeof entityType === "string") {
            if (arguments.length === 1) {
                return metadata[entityType];
            } else {
                if (!metadata[entityType]) {
                    metadata[entityType] = arguments[1];
                }
                // ...else assume the new metadata is the same as that previously registered for entityType.
            }
        } else {
            $.each(entityType, function (entityType, metadata) {
                upshot.metadata(entityType, metadata);
            });
        }
    }

    upshot.metadata.getProperties = function (entity, entityType, includeAssocations) {
        var props = [];
        if (entityType) {
            var metadata = upshot.metadata(entityType);
            if (metadata && metadata.fields) {
                // if metadata is present, we'll loop through the fields
                var fields = metadata.fields;
                for (var prop in fields) {
                    if (includeAssocations || !fields[prop].association) {
                        props.push({ name: prop, type: fields[prop].type, association: fields[prop].association });
                    }
                }
                return props;
            }
        }
        // otherwise we'll use the observability layer to infer the properties
        for (var prop in entity) {
            // TODO: determine if we want to allow the case where hasOwnProperty returns false (hierarchies, etc.)
            if (entity.hasOwnProperty(prop) && obs.isProperty(entity, prop) && (prop.indexOf("jQuery") !== 0)) {
                props.push({ name: prop });
            }
        }
        return props;
    }

    upshot.metadata.getPropertyType = function (entityType, property) {
        if (entityType) {
            var metadata = upshot.metadata(entityType);
            if (metadata && metadata.fields && metadata.fields[property]) {
                return metadata.fields[property].type;
            }
        }
        return null;
    }
}
)(this, jQuery, upshot);
///
/// EntitySource.js
///

(function (global, $, upshot, undefined)
{
    var obs = upshot.observability;

    var ctor = function (options) {
        var result = options && options.result;
        if (result) {
            if (upshot.EntitySource.as(result)) {
                throw "Array is already bound to an EntitySource.";
            }
        }

        this._viewsToRecompute = [];
        this._eventCallbacks = {};
        this._clientEntities = result || obs.createCollection();

        var self = this;
        obs.track(this._clientEntities, {
            afterChange: function (array, type, eventArguments) {
                upshot.__beginChange();
                self._handleArrayChange(type, eventArguments);
            },
            afterEvent: function () {
                upshot.__endChange();
            }
        });

        upshot.cache(this._clientEntities, "entitySource", this);
    };

    var instanceMembers = {

        // Public methods

        dispose: function () {
            /// <summary>
            /// Disposes the EntitySource instance.
            /// </summary>

            if (this._eventCallbacks) {  // Use _eventCallbacks as an indicator as to whether we've been disposed.
                obs.track(this._clientEntities, null);
                upshot.deleteCache(this._clientEntities, "entitySource");
                this._dispose();  // Give subclass code an opportunity to clean up.
                this._eventCallbacks = null;
            }
        },

        // TODO: bind/unbind/_trigger are duplicated in EntitySource and DataContext, consider common routine.
        bind: function (event, callback) {
            /// <summary>
            /// Registers the supplied callback to be called when an event is raised.
            /// </summary>
            /// <param name="event" type="String">
            /// &#10;The event name.
            /// </param>
            /// <param name="callback" type="Function">
            /// &#10;The callback function.
            /// </param>
            /// <returns type="upshot.EntitySource"/>

            if (typeof event === "string") {
                var list = this._eventCallbacks[event] || (this._eventCallbacks[event] = []);
                list.push(callback);
            } else {
                for (var key in event) {
                    this.bind(key, event[key]);
                }
            }
            return this;
        },

        unbind: function (event, callback) {
            /// <summary>
            /// Deregisters the supplied callback for the supplied event.
            /// </summary>
            /// <param name="event" type="String">
            /// &#10;The event name.
            /// </param>
            /// <param name="callback" type="Function">
            /// &#10;The callback function to be deregistered.
            /// </param>
            /// <returns type="upshot.EntitySource"/>

            if (typeof event === "string") {
                var list = this._eventCallbacks && this._eventCallbacks[event];
                if (list) {
                    for (var i = 0, l = list.length; i < l; i++) {
                        if (list[i] === callback) {
                            list.splice(i, 1);
                            break;
                        }
                    }
                }
            } else {
                for (var key in event) {
                    this.unbind(key, event[key]);
                }
            }
            return this;
        },

        getEntities: function () {
            /// <summary>
            /// Returns the stable, observable array of model data.
            /// </summary>
            /// <returns type="Array"/>

            return this._clientEntities;
        },


        // Internal methods

        __registerForRecompute: function (entityView) {
            if ($.inArray(entityView, this._viewsToRecompute) <= 0) {
                this._viewsToRecompute.push(entityView);
            }
        },

        __recomputeDependentViews: function () {
            while (this._viewsToRecompute.length > 0) {  // Downstream entity views might be dirtied due to recompute.
                var viewsToRecompute = this._viewsToRecompute.slice();
                this._viewsToRecompute.splice(0, this._viewsToRecompute.length);
                $.each(viewsToRecompute, function (index, entityView) {
                    entityView.__recompute();
                });
            }
        },

        // Used to translate entity inserts through EntityViews (and onto their input EntitySource).
        __addEntity: function (entity) {
            var index = obs.asArray(this._clientEntities).length;
            obs.insert(this._clientEntities, index, [entity]);

            this._handleArrayChange("insert", { index: index, items: [entity] });
        },

        // Used to translate entity removes through EntityViews (and onto their input EntitySource).
        __deleteEntity: function (entity, index) {
            var index = $.inArray(entity, obs.asArray(this._clientEntities));
            ///#DEBUG
            upshot.assert(index >= 0, "entity must exist!");
            ///#ENDDEBUG
            obs.remove(this._clientEntities, index, 1);

            this._handleArrayChange("remove", { index: index, items: [entity] });
        },

        // Private methods

        _dispose: function () {
            // Will be overridden by derived classes.
        },

        _handleArrayChange: function (type, eventArguments) {
            switch (type) {
                case "insert":
                    var entitiesToAdd = eventArguments.items;
                    if (entitiesToAdd.length > 1) {
                        throw "NYI -- Can only add a single entity to/from an array in one operation.";
                    }

                    var entityToAdd = entitiesToAdd[0];
                    this._handleEntityAdd(entityToAdd);
                    break;

                case "remove":
                    throw "Use 'deleteEntity' to delete entities from your array.  Destructive delete is not yet implemented.";

                case "replaceAll":
                    if (!upshot.sameArrayContents(eventArguments.newItems, obs.asArray(this._clientEntities))) {
                        throw "NYI -- Can only replaceAll with own entities.";
                    }
                    break;

                default:
                    throw "NYI -- Array operation '" + type + "' is not supported.";
            }

            this._trigger("arrayChanged", type, eventArguments);
        },

        _handleEntityAdd: function (entity) {
            // Will be overridden by derived classes to do specific handling for an entity add.
        },

        _purgeEntity: function (entity) {
            // TODO -- Should we try to handle duplicates here?
            var index = $.inArray(entity, obs.asArray(this._clientEntities));
            obs.remove(this._clientEntities, index, 1);
            this._trigger("arrayChanged", "remove", { index: index, items: [entity] });
        },

        _trigger: function (eventType) {
            var list = this._eventCallbacks[eventType];
            if (list) {
                var args = Array.prototype.slice.call(arguments, 1);
                // clone the list to be robust against bind/unbind during callback
                list = list.slice(0);
                for (var i = 0, l = list.length; i < l; i++) {
                    list[i].apply(this, args);
                }
            }
            return this;
        }
    };

    var classMembers = {
        as: function (array) {
            return upshot.cache(array, "entitySource");
        }
    };

    upshot.EntitySource = upshot.defineClass(ctor, instanceMembers, classMembers);
}
)(this, jQuery, upshot);

///
/// EntityView.js
///

(function (global, $, upshot, undefined)
{
    var base = upshot.EntitySource.prototype;

    var obs = upshot.observability;

    var ctor = function (options) {

        this._needRecompute = false;

        var self = this;
        this._observer = {
            propertyChanged: function (entity, property, newValue) { self._onPropertyChanged(entity, property, newValue); },
            arrayChanged: function (type, eventArgs) { self._onArrayChanged(type, eventArgs); },
            entityStateChanged: function (entity, state, error) { self._onEntityStateChanged(entity, state, error); }
        };

        // RemoteDataSource may dynamically bind to its EntitySet as it refreshes.
        this._entitySource = null;  // Make JS runtime type inference happy?

        var entitySource = options && options.source;
        if (entitySource) {
            this._bindToEntitySource(entitySource);
        }

        base.constructor.call(this, options);
    };

    var dataContextMethodNames = [ 
        "getDataContext", 
        "getEntityState", 
        "isPropertyChanged", 
        "getEntityValidationRules", 
        "getEntityId", 
        "revertChange", 
        "revertChanges", 
        "deleteEntity",
        "getEntityErrors",
        "getEntityError",
        "hasChanges"
    ];

    var instanceMembers = {

        ///#DEBUG
        getDataContext: function () {
            /// <summary>
            /// Returns the DataContext used as a cache for model data.
            /// </summary>
            /// <returns type="upshot.DataContext"/>

            throw "Not reached";  // For Intellisense only.
        },

        getEntityState: function (entity) {
            /// <summary>
            /// Returns the EntityState for the supplied entity.
            /// </summary>
            /// <param name="entity" type="Object">
            /// &#10;The entity for which EntityState will be returned.
            /// </param>
            /// <returns type="upshot.EntityState"/>

            throw "Not reached";  // For Intellisense only.
        },

        isPropertyChanged: function (entity, propertyName) {
            /// <summary>
            /// Determines whether a property on a given entity has been updated.
            /// </summary>
            /// <param name="entity" type="Object">
            /// &#10;The entity which may have updated properties.
            /// </param>
            /// <param name="propertyName" type="String">
            /// &#10;The name of the possibly updated property.
            /// </param>
            /// <returns type="Boolean"/>

            throw "Not reached";  // For Intellisense only.
        },

        getEntityValidationRules: function () {
            /// <summary>
            /// Returns entity validation rules for the type of entity returned by this EntityView.
            /// </summary>
            /// <returns type="Object"/>

            throw "Not reached";  // For Intellisense only.
        },

        getEntityId: function (entity) {
            /// <summary>
            /// Returns an identifier for the supplied entity.
            /// </summary>
            /// <param name="entity" type="Object"/>
            /// <returns type="String"/>

            throw "Not reached";  // For Intellisense only.
        },

        revertChange: function (entity, propertyName) {
            /// <summary>
            /// Reverts property updates for the supplied entity back to their original values.
            /// </summary>
            /// <param name="entity" type="Object">
            /// &#10;The entity with updated properties.
            /// </param>
            /// <param name="propertyName" type="String" optional="true">
            /// &#10;If supplied, the name of the possibly updated property.  Otherwise, all updated properties will be reverted to their original values.
            /// </param>
            /// <returns type="upshot.EntityView"/>

            throw "Not reached";  // For Intellisense only.
        },

        revertChanges: function (all) {
            /// <summary>
            /// Reverts any edits to model data (to entities) back to original entity values.
            /// </summary>
            /// <param name="all" type="Boolean" optional="true">
            /// &#10;Revert all model edits in the underlying DataContext (to all types of entities).  Otherwise, revert changes only to those entities of the type loaded by this EntityView.
            /// </param>
            /// <returns type="upshot.EntityView"/>

            throw "Not reached";  // For Intellisense only.
        },

        deleteEntity: function (entity) {
            /// <summary>
            /// Marks the supplied entity for deletion.  This is a non-destructive operation, meaning that the entity will remain in the EntityView.getEntities() array until the server commits the delete.
            /// </summary>
            /// <param name="entity" type="Object">
            /// &#10;The entity to be marked for deletion.
            /// </param>
            /// <returns type="upshot.EntityView"/>

            throw "Not reached";  // For Intellisense only.
        },

        getEntityErrors: function () {
            /// <summary>
            /// Returns an array of server errors by entity, of the form [ &#123; entity: &#60;entity&#62;, error: &#60;object&#62; &#125;, ... ].
            /// </summary>
            /// <returns type="Array"/>

            throw "Not reached";  // For Intellisense only.
        },

        getEntityError: function (entity) {
            /// <summary>
            /// Returns server errors for the supplied entity.
            /// </summary>
            /// <param name="entity" type="Object">
            /// &#10;The entity for which server errors are to be returned.
            /// </param>
            /// <returns type="Object"/>

            throw "Not reached";  // For Intellisense only.
        },

        hasChanges: function (obj, property) {
            /// <summary>
            /// Determines if a given object has updated properties.  The object can be an entity or it can be an object nested within an entity.
            /// </summary>
            /// <param name="obj" type="Object">
            /// &#10;The object being queries as to its updated properties.
            /// </param>
            /// <param name="property" type="String">
            /// &#10;The name of a property that may have been updated on this object.
            /// </param>
            /// <returns type="Boolean"/>

            throw "Not reached";  // For Intellisense only.
        },
        ///#ENDDEBUG


        // Internal methods

        __registerForRecompute: function (entityView) {
            // Some EntityView that depends on us wants to recompute.
            base.__registerForRecompute.apply(this, arguments);

            // Register on our input EntitySource transitively back to the root EntitySources, from which
            // our recompute wave originates.
            this._entitySource.__registerForRecompute(this);
        },

        __recompute: function () {
            // Our input EntitySource is giving us an opportunity to recompute.  Do so, if we've so-marked.
            if (this._needRecompute) {
                this._needRecompute = false;
                this._recompute();
            }

            // Tell EntityViews that depend on us to recompute.
            this.__recomputeDependentViews();
        },


        // Private methods

        _dispose: function () {
            if (this._entitySource) {  // RemoteDataSource dynamically binds to its input EntitySource.
                this._entitySource.unbind(this._observer);
            }
            base._dispose.apply(this, arguments);
        },

        _bindToEntitySource: function (entitySource) {

            if (this._entitySource === entitySource) {
                return;
            }

            var self = this;

            // Remove proxied DataContext-derived methods.
            if (this._entitySource) {
                $.each(dataContextMethodNames, function (index, name) {
                    if (self[name]) {
                        delete self[name];
                    }
                });

                this._entitySource.bind(this._observer);
            }

            this._entitySource = entitySource;

            // Proxy these DataContext-derived methods, if they're available.
            if (entitySource.getDataContext) {
                $.each(dataContextMethodNames, function (index, name) {
                    if (name !== "getEntityErrors") {
                        // Don't use $.proxy here, as that will statically bind to entitySource[name] and
                        // RemoteDataSource will dynamically change entitySource[name].
                        self[name] = function () {
                            var ret = entitySource[name].apply(entitySource, arguments);
                            // TODO: make datacontext api chainable (eg. return this).
                            return (name === "deleteEntity" || /revertChange/.test(name)) ? self : ret;
                        };
                    }
                });
            }

            this.getEntityErrors = function () {
                return $.grep(entitySource.getEntityErrors(), function (error) {
                    return self._haveEntity(error.entity);
                });
            };

            entitySource.bind(this._observer);
        },

        _setNeedRecompute: function () {
            // Sub-classes will call this method to mark themselves as being dirty, requiring recompute.
            this._needRecompute = true;
            this._entitySource.__registerForRecompute(this);
        },

        _recompute: function () {
            // In response to a call to _setNeedRecompute, we're getting called to recompute as
            // part of the next recompute wave.
            throw "Unreachable";  // Abstract/pure virtual method.
        },

        _handleEntityAdd: function (entity) {
            // Translate adds onto our input EntitySource.
            this._entitySource.__addEntity(entity);

            base._handleEntityAdd.apply(this, arguments);
        },

        _haveEntity: function (entity) {
            return $.inArray(entity, obs.asArray(this._clientEntities)) >= 0;
        },

        _purgeEntity: function (entity) {
            base._purgeEntity.apply(this, arguments);
        },

        _onPropertyChanged: function (entity, property, newValue) {
            // Translate property changes from our input EntitySource onto our result, if appropriate.
            // NOTE: _haveEntity will be with respect to our current, stable set of result entities.
            // Ignoring direct, observable inserts and removes, this result set will only change
            // as part of our separate recompute wave, which happens _after_ such data change events.
            if (this._haveEntity(entity)) {
                this._trigger("propertyChanged", entity, property, newValue);
            }
        },

        _onArrayChanged: function (type, eventArgs) {
            // NOTE: These are not translated directly in the same way that property and entity state
            // change events are.  Rather, subclasses have specific logic as to how changes to the 
            // membership of their input EntitySource impacts their result entity membership.

            // Will be overridden by derived classes.
        },

        _onEntityStateChanged: function (entity, state, error) {
            if (this._haveEntity(entity)) {
                if (state === upshot.EntityState.Deleted) {
                    // Entities deleted from our cache (due to an accepted server delete or due to a
                    // reverted internal add) should disappear from all dependent EntityViews.
                    this._purgeEntity(entity);
                }

                // Translate entity state changes from our input EntitySource onto our result, if appropriate.
                // NOTE: _haveEntity will be with respect to our current, stable set of result entities.
                // Ignoring direct, observable inserts and removes, this result set will only change
                // as part of our separate recompute wave, which happens _after_ such change events.
                this._trigger("entityStateChanged", entity, state, error);
            }
        }
    };

    upshot.EntityView = upshot.deriveClass(base, ctor, instanceMembers);

    upshot.EntityView.__dataContextMethodNames = dataContextMethodNames;
}
)(this, jQuery, upshot);

///
/// DataSource.js
///

(function (global, $, upshot, undefined)
{
    var base = upshot.EntityView.prototype;

    var obs = upshot.observability;
    var queryOptions = { paging: "setPaging", sort: "setSort", filter: "setFilter" };

    var ctor = function (options) {

        if (options && options.result && options.result.length !== 0) {
            throw "NYI -- Currently, \"result\" array must be empty to bind to a data source.";
        }

        this._skip = null;
        this._take = null;
        this._includeTotalCount = false;
        this._lastRefreshTotalEntityCount = 0;

        var self = this;
        this._options = [];
        if (options) {
            $.each(options, function (key, value) {
                if (queryOptions[key]) {
                    self[queryOptions[key]](value);
                } else {
                    self._options[key] = value;
                }
            });
        }

        base.constructor.apply(this, arguments);
    };

    var instanceMembers = {

        // Public methods

        // TODO -- These query set-* methods should be consolidated, passing a "settings" parameter.
        // That way, we can issue a single "needs refresh" event when the client updates the query settings.
        // TODO -- Changing query options should trigger "results stale".

        setSort: function (sort) {
            throw "Unreachable";  // Abstract/pure virtual method.
        },

        setFilter: function (filter) {
            throw "Unreachable";  // Abstract/pure virtual method.
        },

        setPaging: function (paging) {
            /// <summary>
            /// Establishes the paging specification that is to be applied when loading model data.
            /// </summary>
            /// <param name="paging">
            /// &#10;The paging specification to be applied when loading model data.
            /// &#10;Should be supplied as an object of the form &#123; skip: &#60;number&#62;, take: &#60;number&#62;, includeTotalCount: &#60;bool&#62; &#125;.  All properties on this object are optional.
            /// &#10;When supplied as null or undefined, the paging specification for this DataSource is cleared.
            /// </param>
            /// <returns type="upshot.DataSource"/>

            paging = paging || {};
            this._skip = paging.skip;
            this._take = paging.take;
            this._includeTotalCount = !!paging.includeTotalCount;
            return this;
        },

        getTotalEntityCount: function () {
            /// <summary>
            /// Returns the total entity count from the last refresh operation on this DataSource.  This count will differ from DataSource.getEntities().length when a filter or paging specification is applied to this DataSource.
            /// </summary>
            /// <returns type="Number"/>

            // NOTE: We had been updating this to reflect internal, client-only adds, but this doesn't
            // generalize nicely.  For instance, a RemoteDataSource might have server-only logic that 
            // determines whether an added entity should be included in a filtered query result.
            // TODO: Revisit this conclusion.
            return this._lastRefreshTotalEntityCount;
        },

        refresh: function (options) {
            throw "Unreachable";  // Abstract/pure virtual method.
        },

        reset: function () {
            /// <summary>
            /// Empties the result array for this DataSource (that is, the array returned by DataSource.getEntities()).  The result array can be repopulated using DataSource.refresh().
            /// </summary>
            /// <returns type="Number"/>

            this._applyNewQueryResult([]);
            return this;
        },


        // Private methods

        // acceptable filter parameter
        // { property: "Id", operator: "==", value: 1 }  // default operator is "=="
        // and an array of such
        _normalizeFilters: function (filter) {
            filter = upshot.isArray(filter) ? filter : [filter];
            var filters = [];
            for (var i = 0; i < filter.length; i++) {
                var filterPart = filter[i];
                if (filterPart) {
                    if (!$.isFunction(filterPart)) {
                        filterPart.operator = filterPart.operator || "==";
                    }
                    filters.push(filterPart);
                }
            }
            return filters;
        },

        _completeRefresh: function (entities, totalCount, success) {
            if (this._applyNewQueryResult(entities, totalCount)) {
                upshot.__triggerRecompute();
            }

            var newClientEntities = obs.asArray(this._clientEntities),
            newTotalCount = this._lastRefreshTotalEntityCount;
            this._trigger("refreshSuccess", newClientEntities, newTotalCount);
            if ($.isFunction(success)) {
                success.call(this, newClientEntities, newTotalCount);
            }
        },

        _failRefresh: function (httpStatus, errorText, context, fail) {
            this._trigger("refreshError", httpStatus, errorText, context);
            if ($.isFunction(fail)) {
                fail.call(this, httpStatus, errorText, context);
            }
        },

        _trigger: function (eventType) {
            base._trigger.apply(this, arguments);
            if (this._options[eventType]) {
                this._options[eventType].apply(this, Array.prototype.slice.call(arguments, 1));
            }
        },

        _applyNewQueryResult: function (entities, totalCount) {
            this._lastRefreshTotalEntityCount = totalCount;

            var sameEntities = upshot.sameArrayContents(obs.asArray(this._clientEntities), entities);
            if (!sameEntities) {
                // Update our client entities.
                var oldEntities = obs.asArray(this._clientEntities).slice();
                obs.refresh(this._clientEntities, entities);
                this._trigger("arrayChanged", "replaceAll", { oldItems: oldEntities, newItems: obs.asArray(this._clientEntities) });
                return true;
            } else {
                return false;
            }
        }
    };

    upshot.DataSource = upshot.deriveClass(base, ctor, instanceMembers);

}
)(this, jQuery, upshot);

///
/// EntitySet.js
///

(function (global, $, upshot, undefined)
{
    var base = upshot.EntitySource.prototype;

    var obs = upshot.observability;

    var ctor = function (dataContext, entityType) {

        this._dataContext = dataContext;
        this._entityType = entityType;

        this._callbacks = {};
        this._serverEntities = [];
        this._entityStates = {};
        this._addedEntities = [];
        this._errors = [];
        this._associatedEntitiesViews = {};
        this._tracked = {};
        this._tracker = null;
        this._deferredEntityStateChangeEvents = [];

        base.constructor.call(this);

        upshot.__registerRootEntitySource(this);
    };


    var instanceMembers = {

        // Public methods

        dispose: function () {
            throw "EntitySets should only be disposed by their DataContext.";
        },

        // TODO, kylemc: how does this compose with bind/unbind on EntitySource?
        _bind: function (event, obj, callback) {
            /// <summary>Binds to an event</summary>
            /// <param name="event" type="String">The event to bind to.
            /// &#10;
            /// &#10; 'change': Raised any time the state changes of the object or array. Triggered by observable changes, reverting, and commiting. State changes to children will also trigger a change event.
            /// &#10;           The callback signature is 'function(obj, hasChanges)'.
            /// </param>
            /// <param name="obj">The object or array to bind to</param>
            /// <param name="callback" type="Function">The callback</param>
            var list = this._callbacks[event] || (this._callbacks[event] = []);
            list.push({ obj: obj, callback: callback });
            return this;
        },

        _unbind: function (event, obj, callback) {
            var list = this._callbacks[event];
            if (list) {
                for (var i = 0, l = list.length; i < l; i++) {
                    if (list[i] && (obj === list[i].obj) && (callback === list[i].callback)) {
                        list.splice(i, 1);
                        break;
                    }
                }
            }
            return this;
        },

        _triggerEvent: function (event, obj) {
            var self = this,
                list = this._callbacks[event],
                args = Array.prototype.slice.call(arguments, 1);
            if (list) {
                for (var i = 0, l = list.length; i < l; i++) {
                    var sub = list[i];
                    if (sub.obj === obj) {
                        sub.callback.apply(this, args);
                    }
                }
            }
            return this;
        },

        getEntityState: function (entity) {
            /// <summary>
            /// Returns the EntityState for the supplied entity.
            /// </summary>
            /// <param name="entity" type="Object">
            /// &#10;The entity for which EntityState will be returned.
            /// </param>
            /// <returns type="upshot.EntityState"/>

            var id = this.getEntityId(entity);
            return id === null ? null : this._entityStates[id];
        },

        getEntityId: function (entity) {
            /// <summary>
            /// Returns an identifier for the supplied entity.
            /// </summary>
            /// <param name="entity" type="Object"/>
            /// <returns type="String"/>

            var addedEntity = this._getAddedEntityFromEntity(entity);
            if (addedEntity) {
                return addedEntity.clientId;
            }

            try {  // This entity might not have valid PK property values (a reverted add, for instance).
                // Trust only the property values on the original entity, allowing the client to update id properties.
                return this._getClientEntityIdentity(entity);
            } catch (e) {
                return null;
            }
        },

        getDataContext: function () {
            /// <summary>
            /// Returns the DataContext used as a cache for model data.
            /// </summary>
            /// <returns type="upshot.DataContext"/>

            return this._dataContext;
        },

        getEntityValidationRules: function () {
            /// <summary>
            /// Returns entity validation rules for the type of entity cached by this EntitySet.
            /// </summary>
            /// <returns type="Object"/>

            var metadata = upshot.metadata(this._entityType);
            return metadata && metadata.rules && {
                rules: metadata.rules,
                messages: metadata.messages
            };
        },

        isPropertyChanged: function (entity, propertyName) {
            /// <summary>
            /// Determines whether a property on a given entity has been updated.
            /// </summary>
            /// <param name="entity" type="Object">
            /// &#10;The entity which may have updated properties.
            /// </param>
            /// <param name="propertyName" type="String">
            /// &#10;The name of the possibly updated property.
            /// </param>
            /// <returns type="Boolean"/>

            return this.hasChanges(entity, propertyName);
        },

        getEntityErrors: function () {
            /// <summary>
            /// Returns an array of server errors by entity, of the form [ &#123; entity: &#60;entity&#62;, error: &#60;object&#62; &#125;, ... ].
            /// </summary>
            /// <returns type="Array"/>

            var self = this;
            return $.map(this._errors, function (trackingId) {
                var tracking = self._tracked[trackingId];
                return { entity: tracking.obj, error: tracking.error };
            });
        },

        getEntityError: function (entity) {
            /// <summary>
            /// Returns server errors for the supplied entity.
            /// </summary>
            /// <param name="entity" type="Object">
            /// &#10;The entity for which server errors are to be returned.
            /// </param>
            /// <returns type="Object"/>

            var trackingId = this._getTrackingId(entity);
            if (trackingId) {
                return this._tracked[trackingId].error;
            }
        },

        revertChange: function (entity, propertyName) {
            /// <summary>
            /// Reverts property updates for the supplied entity back to their original values.
            /// </summary>
            /// <param name="entity" type="Object">
            /// &#10;The entity with updated properties.
            /// </param>
            /// <param name="propertyName" type="String" optional="true">
            /// &#10;If supplied, the name of the possibly updated property.  Otherwise, all updated properties will be reverted to their original values.
            /// </param>
            /// <returns type="upshot.EntitySet"/>

            var id = this.getEntityId(entity);

            var state = id !== null && this._entityStates[id];
            if (!state || state === upshot.EntityState.Deleted) {
                throw "Entity no longer cached in data context.";
            }

            if (!propertyName) {
                if (state === upshot.EntityState.ClientDeleted || state === upshot.EntityState.ClientUpdated) {
                    // Do this before the model change, so listeners on data change events see consistent entity state.
                    this._updateEntityState(id, upshot.EntityState.Unmodified);

                    this._restoreOriginalValues(entity, this._entityType, null);
                    // TODO -- Might we sniff the entity and revert to "ClientUpdated" from "ClientDeleted" for
                    // a entity where a property has been updated then the entity deleted?  Confusing?
                } else if (state === upshot.EntityState.ClientAdded) {
                    this._purgeUncommittedAddedEntity(this._getAddedEntityFromId(id), true);
                } else {
                    throw "Entity changes cannot be reverted for entity in state '" + state + "'.";
                }
            } else {
                if (state !== upshot.EntityState.ClientUpdated) {
                    throw "Property change cannot be reverted for entity in state '" + state + "'.";
                } else {
                    // Do this before the model change, so listeners on data change events see consistent entity state.
                    this._changeEntityStateForUpdate(entity);
                    this._restoreOriginalValues(entity, this._entityType, propertyName);
                    // TODO -- Check if propertyName should exist on entity according to metadata?
                    // TODO -- Should we reason over errors and GC those pertaining to propertyName here?
                    // TODO -- Extend support to parent entity properties?
                }
            }

            upshot.__triggerRecompute();

            return this;
        },

        revertChanges: function (all) {
            /// <summary>
            /// Reverts any edits to model data (to entities) back to original entity values.
            /// </summary>
            /// <param name="all" type="Boolean" optional="true">
            /// &#10;Revert all model edits in the underlying DataContext (to all types of entities).  Otherwise, revert changes only to those entities of the type cached by this EntitySet.
            /// </param>
            /// <returns type="upshot.EntitySet"/>

            if (!!all) {
                this._dataContext.revertChanges();
            } else {
                this.__revertChanges();
                upshot.__triggerRecompute();
            }

            return this;
        },

        hasChanges: function (obj, property) {
            /// <summary>
            /// Determines if a given object has updated properties.  The object can be an entity or it can be an object nested within an entity.
            /// </summary>
            /// <param name="obj" type="Object">
            /// &#10;The object being queries as to its updated properties.
            /// </param>
            /// <param name="property" type="String">
            /// &#10;The name of a property that may have been updated on this object.
            /// </param>
            /// <returns type="Boolean"/>

            if (upshot.isArray(obj) && property) {
                throw "Property is not a supported parameter when inspecting array changes";
            }

            var changes = this._getChanges(obj);
            if (!changes) { return false; }
            if (!property) { return true; }

            return changes.original.hasOwnProperty(property);
        },

        deleteEntity: function (entity) {
            /// <summary>
            /// Marks the supplied entity for deletion.  This is a non-destructive operation, meaning that the entity will remain in the EntitySet.getEntities() array until the server commits the delete.
            /// </summary>
            /// <param name="entity" type="Object">
            /// &#10;The entity to be marked for deletion.
            /// </param>
            /// <returns type="upshot.EntitySet"/>

            var id = this.getEntityId(entity),
            index = id !== null && this._getEntityIndexFromId(id),
            addedEntityBeingDeleted = id !== null && this._getAddedEntityFromId(id),
            deletingAddedEntity = index < 0 && addedEntityBeingDeleted;
            if (deletingAddedEntity) {
                var entityState = this._entityStates[id];
                if (entityState === upshot.EntityState.ClientAdded) {
                    // Deleting a entity that is uncommitted and only on the client.
                    // TODO -- Reconsider whether we shouldn't throw here, force clients to revert instead.
                    this._purgeUncommittedAddedEntity(addedEntityBeingDeleted, true);
                } else {
                    // To be in addedEntities but not in entities, entity should either be in a
                    // pre-commit or committing state.
                    ///#DEBUG
                    upshot.assert(entityState === upshot.EntityState.ServerAdding);
                    ///#ENDDEBUG

                    // TODO -- Need to detect and enqueue dependent commits?
                    throw "NYI -- Can't edit a entity while previous edits are being committed.";
                }
            } else if (index < 0) {
                throw "Entity no longer cached in data context.";
            } else {
                if (upshot.EntityState.isServerSyncing(this._entityStates[id])) {
                    // TODO -- Need to detect and enqueue dependent commits?
                    throw "NYI -- Can't edit a entity while previous edits are being committed.";
                }

                this._updateEntityState(id, upshot.EntityState.ClientDeleted);

                this._dataContext.__queueImplicitCommit();
            }

            upshot.__triggerRecompute();

            return this;
        },

        // Internal methods

        __dispose: function () {
            var self = this;
            $.each(this._tracked, function (key, value) {
                self._deleteTracking(value.obj);
            });
            upshot.__deregisterRootEntitySource(this);
            base.dispose.call(this);
        },

        __hasUncommittedEdits: function () {
            var hasUncommittedEdits = false;
            $.each(this._entityStates, function (key, value) {
                if (value !== upshot.EntityState.Unmodified) {
                    hasUncommittedEdits = true;
                }
            });
            return hasUncommittedEdits;
        },

        __loadEntities: function (entities) {
            // For each entity, either merge it with a cached entity or add it to the cache.
            var self = this,
            entitiesNewToEntitySet = [],
            indexToInsertClientEntities = this._serverEntities.length;
            // Re: indexToInsertClientEntities, by convention, _clientEntities are layed out as updated followed by
            // added entities.
            var mergedLoadedEntities = $.map(entities, function (entity) {
                return self._loadEntity(entity, entitiesNewToEntitySet);
            });

            if (entitiesNewToEntitySet.length > 0) {
                // Don't trigger a 'reset' here.  What would RemoteDataSources do with such an event?
                // They only have a subset of our entities as the entities they show their clients.  They could
                // only reapply their remote query in response to "refresh".
                obs.insert(this._clientEntities, indexToInsertClientEntities, entitiesNewToEntitySet);
                this._trigger("arrayChanged", "insert", { index: indexToInsertClientEntities, items: entitiesNewToEntitySet });
            }

            return mergedLoadedEntities;
        },

        __getEditedEntities: function () {
            var self = this,
            entities = [];
            $.each(this._entityStates, function (id, state) {
                if (upshot.EntityState.isClientModified(state)) {
                    entities.push(self._getEntityFromId(id));
                }
            });

            return entities;
        },

        __getEntityEdit: function (entity) {
            // TODO -- Throughout here, we should consult schema and strip off fields that aren't
            // compliant (like jQuery's __events__ field).

            var id = this.getEntityId(entity),
            self = this,
            submittingState,
            operation,
            addEntityType = function (entityToExtend) {
                return $.extend({ "__type": self._entityType }, entityToExtend);
            };
            switch (this._entityStates[id]) {
                case upshot.EntityState.ClientUpdated:
                    submittingState = upshot.EntityState.ServerUpdating;
                    operation = {
                        Operation: 3,
                        Entity: addEntityType(this._getSerializableEntity(entity)),
                        OriginalEntity: addEntityType(this._getOriginalValue(entity, this._entityType))
                    };
                    break;

                case upshot.EntityState.ClientAdded:
                    submittingState = upshot.EntityState.ServerAdding;
                    entity = this._getAddedEntityFromId(id).entity;
                    operation = {
                        Operation: 2,
                        Entity: addEntityType(this._getSerializableEntity(entity))
                    };
                    break;

                case upshot.EntityState.ClientDeleted:
                    submittingState = upshot.EntityState.ServerDeleting;
                    operation = {
                        Operation: 4,
                        Entity: addEntityType(this._getOriginalValue(entity, this._entityType))
                    };
                    // TODO -- Do we allow for concurrency guards here?
                    break;

                default:
                    throw "Unrecognized entity state.";
            }

            var lastError = self.getEntityError(entity);
            var edit = {
                entityType: this._entityType,
                storeEntity: entity,
                operation: operation,
                updateEntityState: function () {
                    self._updateEntityState(id, submittingState, lastError);
                },
                succeeded: function (result) {
                    self._handleSubmitSucceeded(id, operation, result);
                },
                failed: function (error) {
                    self._handleSubmitFailed(id, operation, error || lastError);
                }
            };
            return edit;
        },

        __revertChanges: function () {
            var synchronizing;
            $.each(this._entityStates, function (unused, state) {
                if (upshot.EntityState.isServerSyncing(state)) {
                    synchronizing = true;
                    return false;
                }
            });
            if (synchronizing) {
                throw "Can't revert changes while a commit is in progress.";
            }

            var self = this;
            var uncommittedAddedEntities = $.grep(this._addedEntities, function (addedEntity) {
                return addedEntity.entity && self._getEntityIndex(addedEntity.entity) < 0;
            });

            // Remove uncommitted added entities.
            if (uncommittedAddedEntities.length > 0) {
                this._addedEntities = $.grep(this._addedEntities, function (addedEntity) {
                    return $.inArray(addedEntity, uncommittedAddedEntities) < 0;
                });
                $.each(uncommittedAddedEntities, function (index, addedEntity) {
                    self._purgeUncommittedAddedEntity(addedEntity, true);
                });
            }

            // Revert "Client"-* entity states to "Unmodified" and discard changes to entities.
            for (var id in this._entityStates) {
                if (upshot.EntityState.isClientModified(this._entityStates[id])) {
                    // Do this before the model change, so listeners on data change events see consistent entity state.
                    this._updateEntityState(id, upshot.EntityState.Unmodified);

                    var entity = this._getEntityFromId(id);
                    this._restoreOriginalValues(entity, this._entityType, null);
                }
            }

            ///#DEBUG
            upshot.assert(this._errors.length === 0, "must be empty!");
            ///#ENDDEBUG
        },

        __flushEntityStateChangedEvents: function () {
            var self = this;
            $.each(this._deferredEntityStateChangeEvents, function (index, eventArguments) {
                self._trigger.apply(self, ["entityStateChanged"].concat(eventArguments));
            });
            this._deferredEntityStateChangeEvents.splice(0, this._deferredEntityStateChangeEvents.length);
        },

        // Used when AssociatedEntitiesView translates an entity add into a FK property change.
        __setProperty: function (entity, propertyName, value) {
            var eventArguments = { oldValues: {}, newValues: {} };
            eventArguments.oldValues[propertyName] = obs.getProperty(entity, propertyName);
            eventArguments.newValues[propertyName] = value;

            // NOTE: Cribbed from _getTracker/beforeChange.  Keep in sync.
            this._copyOnWrite(entity, eventArguments);
            this._removeTracking(this._getOldFromEvent("change", eventArguments));

            obs.setProperty(entity, propertyName, value);

            // NOTE: Cribbed from _getTracker/afterChange.  Keep in sync.
            this._addTracking([value], upshot.metadata.getPropertyType(this._entityType, propertyName), entity, propertyName);
            this._bubbleChange(entity, null, eventArguments);
        },


        // Private methods

        _loadEntity: function (entity, entitiesNewToEntitySet) {
            var serverIdentity = this._getEntityIdentity(entity),
                index = this._getEntityIndexFromIdentity(serverIdentity);
            if (index >= 0) {
                entity = this._merge(this._serverEntities[index].entity, entity);
            } else {
                var id = serverIdentity;  // Ok to use this as an id, as this is a new, unmodified server entity.
                this._addTracking([entity], this._entityType);
                this._entityStates[id] = upshot.EntityState.Unmodified;
                this._serverEntities.push({ entity: entity, identity: id });
                this._updateEntityState(id, upshot.EntityState.Unmodified, null, entity);
                this._addAssociationProperties(entity);

                entitiesNewToEntitySet.push(entity);
            }
            return entity;
        },

        _handleEntityAdd: function (entity) {
            if (this._getEntityIndex(entity) >= 0 ||  // ...in entities from last query
                this._getAddedEntityFromEntity(entity)) {  // ...in added entities
                throw "Entity already in data source.";
            }

            var id = upshot.uniqueId("added");
            addedEntity = { entity: entity, clientId: id };
            this._addedEntities.push(addedEntity);
            // N.B.  Entity will already have been added to this._clientEntities, as clients issue CUD operations
            // against this._clientEntities.
            this._addTracking([entity], this._entityType);
            this._entityStates[id] = upshot.EntityState.Unmodified;
            this._updateEntityState(id, upshot.EntityState.ClientAdded);
            this._addAssociationProperties(entity);

            this._dataContext.__queueImplicitCommit();

            base._handleEntityAdd.apply(this, arguments);
        },

        _changeEntityStateForUpdate: function (entity) {
            var index = this._getEntityIndex(entity),
            updatingAddedEntity = index < 0 && this._getAddedEntityFromEntity(entity);
            if (updatingAddedEntity) {
                var entityState = this._entityStates[this.getEntityId(entity)];
                if (entityState === upshot.EntityState.ClientAdded) {
                    // Updating a entity that is uncommitted and only on the client.
                    // Edit state remains "ClientAdded".  We won't event an edit state change (so clients had
                    // better be listening on "change").
                    // Fall through and do implicit commit, if appropriate.
                } else {
                    // To be in addedEntities but not in entities, entity should either be in a
                    // pre-commit or committing state.
                    ///#DEBUG
                    upshot.assert(entityState === upshot.EntityState.ServerAdding);
                    ///#ENDDEBUG

                    // TODO -- What do we do if this entity is in the process of being added to the server?
                    // We'll have to enqueue this update and treat it properly with respect to errors on the add, just
                    // as we'll enqueue any dependent edits?
                    throw "NYI -- Can't update an added entity while it's being committed.";
                }
            } else if (index < 0) {
                throw "Entity no longer cached in data context.";
            } else {
                var id = this.getEntityId(entity);

                if (upshot.EntityState.isServerSyncing(this._entityStates[id])) {
                    // TODO -- Need to detect and enqueue dependent commits?
                    throw "NYI -- Can't edit a entity while previous edits are being committed.";
                }

                // TODO -- What if entity is in the "ClientDeleted" state?  Should we discard the delete or throw?
                this._updateEntityState(id, upshot.EntityState.ClientUpdated, this.getEntityError(entity));
            }

            this._dataContext.__queueImplicitCommit();
        },

        _updateEntityState: function (id, state, error, entity) {
            /// <param name="errors" optional="true"></param>
            /// <param name="entity" optional="true"></param>

            entity = entity || this._getEntityFromId(id);  // Notifying after a purge requires that we pass the entity for id.

            var oldState = this._entityStates[id];
            if (this._entityStates[id]) {  // We'll purge the entity before raising "Deleted".
                this._entityStates[id] = state;
                if (oldState !== state) {
                    // TODO: The change event for EntityState won't be deferred here, like it is for _raiseEntityStateChangedEvent.
                    obs.setContextProperty(entity, "EntityState", state); // TODO -- do we want this 'reserved' property to be configurable?
                }
            }

            var errorChanged = this._updateEntityError(entity, error);

            // TODO -- Use "error" to maintain lists of uncommitted and of in-error operations.
            // Allow for resolve/retry on in-error operations.

            if (oldState !== state || errorChanged) {
                this._deferredEntityStateChangeEvents.push([entity, state, error]);
            }
        },

        // ----------------------------------------
        // | old | new | description              |
        // |-----|-----|--------------------------|
        // |  X  |  X  | no-op                    |
        // |  /  |  X  | remove old from _errors  |
        // |  X  |  /  | add new to _errors       |
        // |  /  |  /  | replace old with new     | 
        // ----------------------------------------
        _updateEntityError: function (entity, newError) {
            var trackingId = this._getTrackingId(entity),
                tracking = this._tracked[trackingId],
                changed;

            var oldIndex = $.inArray(trackingId, this._errors);
            if (oldIndex <= -1) {
                if (newError) {
                    this._errors.push(trackingId);
                    tracking.error = newError;
                    changed = true;
                }
            } else if (newError) {
                if (newError !== tracking.error) {
                    tracking.error = newError;
                    changed = true;
                }
            } else {
                this._errors.splice(oldIndex, 1);
                delete tracking.error;
                changed = true;
            }

            if (changed) {
                obs.setContextProperty(entity, "EntityError", newError); // TODO -- do we want this 'reserved' property to be configurable?            
            }
            return changed;
        },

        _purgeEntityAtIndex: function (indexToPurge) {
            var entityToPurge = this._serverEntities[indexToPurge].entity,
            idToPurge = this.getEntityId(entityToPurge);

            // Remove our observable extensions from the entity being purged.
            this._removeTracking([entityToPurge]);

            this._serverEntities.splice(indexToPurge, 1);
            this._purgeEntity(entityToPurge);

            delete this._entityStates[idToPurge];
            this._disposeAssociationEntitiesViews(idToPurge);

            if (this._getAddedEntityFromId(idToPurge)) {
                this._addedEntities = $.grep(this._addedEntities, function (entity) { return entity.clientId !== idToPurge; });
            }

            // TODO -- Have a specific event for entities leaving the cache?
        },

        _getEntityIdentity: function (entity) {
            return upshot.EntitySet.__getIdentity(entity, this._entityType);
        },

        _getEntityIndexFromId: function (id) {
            var addedEntity = this._getAddedEntityFromId(id),
            idToFind;
            if (!addedEntity) {
                idToFind = id;
            } else if (addedEntity.serverId === undefined) {
                return -1;
            } else {
                idToFind = addedEntity.serverId;
            }

            var index = -1;
            for (var i = 0; i < this._serverEntities.length; i++) {
                if (this._serverEntities[i].identity === idToFind) {
                    index = i;
                    break;
                }
            }

            return index;
        },

        _getEntityIndexFromIdentity: function (id) {
            var index = -1;
            for (var i = 0; i < this._serverEntities.length; i++) {
                if (this._serverEntities[i].identity === id) {
                    index = i;
                    break;
                }
            }

            return index;
        },

        _getEntityIndex: function (entity) {
            var index = -1;
            for (var i = 0; i < this._serverEntities.length; i++) {
                if (this._serverEntities[i].entity === entity) {
                    index = i;
                    break;
                }
            }

            return index;
        },

        // This will get client-side identity (if has changed, use the original value).
        _getClientEntityIdentity: function (entity) {
            return this._getEntityIdentity(this.hasChanges(entity) ? this._getOriginalValue(entity, this._entityType) : entity);
        },

        _addTracking: function (objects, type, parent, property) {
            var self = this;
            $.each(objects, function (index, value) {
                self._addTrackingRecursive(parent, property, value, type);
            });
        },

        _addTrackingRecursive: function (parent, property, obj, type) {
            if (upshot.isArray(obj) || upshot.isObject(obj)) {
                var tracking = this._getTracking(obj);
                if (tracking) {
                    if (tracking.active) {
                        throw "Value is already tracked";
                    }
                } else {
                    var trackingId = upshot.cache(obj, "trackingId", upshot.uniqueId("tracking"));
                    tracking = this._tracked[trackingId] = {};
                }

                tracking.obj = obj;
                tracking.type = type;
                tracking.parentId = this._getTrackingId(parent) || null;
                tracking.property = upshot.isArray(parent) ? null : property;
                tracking.active = true;
                tracking.changes = tracking.changes || null;

                obs.track(obj, this._getTracker(), this._entityType);

                if (upshot.isArray(obj)) {
                    // Primitive values don't get mapped.  Avoid iteration over the potentially large array.
                    // TODO: This precludes heterogeneous arrays.  Should we test for primitive element type here instead?
                    if(obj.length > 0 && (upshot.isArray(obj[0]) || upshot.isObject(obj[0]))) {
                        // Since we're recursing through the entity, we won't need to use asArray on collection-typed properties
                        var self = this;
                        $.each(obj, function (index, value) {
                            self._addTrackingRecursive(obj, index, value, type);
                        });
                    }
                } else {
                    var self = this;
                    $.each(upshot.metadata.getProperties(obj, type), function (index, prop) {
                        self._addTrackingRecursive(obj, prop.name, obs.getProperty(obj, prop.name), prop.type);
                    });
                }
            }
        },

        _getTracker: function () {
            if (this._tracker === null) {
                var self = this;
                this._tracker = {
                    beforeChange: function (target, type, eventArguments) {
                        if (!self._isAssociationPropertySet(target, type, eventArguments)) {
                            self._copyOnWrite(target, eventArguments);
                            self._removeTracking(self._getOldFromEvent(type, eventArguments));
                        }
                    },
                    afterChange: function (target, type, eventArguments) {
                        upshot.__beginChange();
                        if (!self._handleAssociationPropertySet(target, type, eventArguments)) {
                            var tracking = self._getTracking(target);
                            if (type === "change") {
                                $.each(eventArguments.newValues, function (key, value) {
                                    self._addTracking([value], upshot.metadata.getPropertyType(tracking.type, key), target, key);
                                });
                            } else {
                                self._addTracking(self._getNewFromEvent(type, eventArguments), tracking.type, target);
                            }
                            self._bubbleChange(target, null, eventArguments);
                        }
                    },
                    afterEvent: function (target, type, eventArguments) {
                        upshot.__endChange();
                    }
                };
                if (this._dataContext.__manageAssociations) {
                    this._tracker.includeAssociations = true;
                }
            }
            return this._tracker;
        },

        _isAssociationPropertySet: function (target, type, eventArguments) {
            if (type === "change" && this._dataContext.__manageAssociations && this._getTracking(target).parentId === null) {
                var fieldsMetadata = (upshot.metadata(this._entityType) || {}).fields;
                if (fieldsMetadata) {
                    for (var fieldName in fieldsMetadata) {
                        var fieldMetadata = fieldsMetadata[fieldName];
                        if (fieldMetadata.association &&
                            (fieldName in eventArguments.oldValues || fieldName in eventArguments.newValues)) {

                            // TODO: Treat case when oldValues/newValues contains multiple property names.
                            if (this._getOldFromEvent(type, eventArguments).length > 1 ||
                                this._getNewFromEvent(type, eventArguments).length > 1) {
                                throw "NYI -- Can't include association properties in N>1 property sets.";
                            }

                            return true;
                        }
                    }
                }
            }

            return false;
        },

        _handleAssociationPropertySet: function (target, type, eventArguments) {
            if (!this._isAssociationPropertySet(target, type, eventArguments)) {
                return false;
            }
            // TODO: Throw an exception when someone tries to replace the array under a child entities property.

            var id = this.getEntityId(target);
            if (id === null || !(id in this._entityStates)) {
                throw "Entity no longer cached in data context.";
            }

            // Determine the single property whose value is being set.
            var fieldName;
            for (var fieldNameT in eventArguments.oldValues) {
                fieldName = fieldNameT;
                break;
            }
            if (!fieldName) {
                for (var fieldNameT in eventArguments.newValues) {
                    fieldName = fieldNameT;
                    break;
                }
            }

            var associatedEntitiesViews = this._associatedEntitiesViews[id],
                associatedEntitiesView = associatedEntitiesViews[fieldName];
            associatedEntitiesView.__handleParentPropertySet(eventArguments.newValues[fieldName]);

            return true;
        },

        _removeTracking: function (objects) {
            var self = this;
            $.each(objects, function (index, value) {
                self._removeTrackingRecursive(value);
            });
        },

        _removeTrackingRecursive: function (obj) {
            if (upshot.isArray(obj) || upshot.isObject(obj)) {
                var tracking = this._getTracking(obj);
                if (tracking) {
                    if (tracking.changes === null) {
                        this._deleteTracking(obj);
                    } else {
                        tracking.active = false;
                    }

                    obs.track(obj, null);

                    if (upshot.isArray(obj)) {
                        // Primitive values don't get mapped.  Avoid iteration over the potentially large array.
                        // TODO: This precludes heterogeneous arrays.  Should we test for primitive element type here instead? 
                        if(obj.length > 0 && (upshot.isArray(obj[0]) || upshot.isObject(obj[0]))) {
                            var self = this;
                            $.each(obj, function (index, value) {
                                self._removeTrackingRecursive(value);
                            });
                        }
                    } else {
                        var self = this;
                        $.each(obj, function (key) {
                            self._removeTrackingRecursive(obs.getProperty(obj, key));
                        });
                    }
                }
            }
        },

        _deleteTracking: function (obj) {
            var trackingId = this._getTrackingId(obj);

            upshot.deleteCache(obj, "trackingId");

            delete this._tracked[trackingId];
        },

        _getOldFromEvent: function (type, eventArguments) {
            if (type === "change") {
                // TODO -- add test coverage for N-property updates
                var old = [];
                $.each(eventArguments.oldValues, function (key, value) {
                    old.push(value);
                });
                return old;
            } else {
                if (type === "remove") {
                    return eventArguments.items;
                } else if (type === "replaceAll") {
                    return eventArguments.oldItems;
                }
            }
            return [];
        },

        _getNewFromEvent: function (type, eventArguments) {
            if (type === "change") {
                // TODO -- add test coverage for N-property updates
                var _new = [];
                $.each(eventArguments.newValues, function (key, value) {
                    _new.push(value);
                });
                return _new;
            } else {
                if (type === "insert") {
                    return eventArguments.items;
                } else if (type === "replaceAll") {
                    return eventArguments.newItems;
                }
            }
            return [];
        },

        _getTrackingId: function (obj) {
            return upshot.cache(obj, "trackingId");
        },

        _getTracking: function (obj) {
            var trackingId = this._getTrackingId(obj);
            return trackingId ? this._tracked[trackingId] : null;
        },

        _getChanges: function (obj) {
            var tracking = this._getTracking(obj);
            return tracking ? this._getTracking(obj).changes : null;
        },

        _bubbleChange: function (obj, child, eventArguments) {
            var parentId = this._getTracking(obj).parentId;

            if (child) {
                this._recordChangedChild(obj, child);
            }

            if (parentId === null) {
                if (upshot.isArray(obj)) {
                    this._handleArrayChangeInternal(obj);
                } else {
                    this._handlePropertyChangeInternal(obj, eventArguments, child === null);
                }
            } else {
                this._bubbleChange(this._tracked[parentId].obj, obj, eventArguments);
            }

            this._triggerEvent("change", obj, true);
        },

        _copyOnWrite: function (obj, eventArguments) {
            if (upshot.isArray(obj)) {
                this._recordWriteToArray(obj);
            } else {
                this._recordWriteToObject(obj, eventArguments.oldValues);
            }
        },

        _recordWriteToArray: function (array) {
            var tracking = this._getTracking(array),
                changes = tracking.changes || (tracking.changes = {
                    original: null,
                    children: {}
                });

            changes.original || (changes.original = array.slice(0));
        },

        _recordWriteToObject: function (obj, oldValues) {
            var tracking = this._getTracking(obj),
                changes = tracking.changes || (tracking.changes = {
                    original: {},
                    children: {}
                });

            $.each(oldValues, function (key, value) {
                changes.original.hasOwnProperty(key) || (changes.original[key] = value);
            });
        },

        _recordChangedChild: function (obj, child) {
            upshot.isArray(obj) ?
                this._recordChangedChildOfArray(obj, child) :
                this._recordChangedChildOfObject(obj, child);
        },

        _recordChangedChildOfArray: function (array, child) {
            var tracking = this._getTracking(array),
                changes = tracking.changes || (tracking.changes = {
                    original: null,
                    children: {}
                }),
                childId = this._getTrackingId(child);

            changes.children[childId] = childId;
        },

        _recordChangedChildOfObject: function (obj, child) {
            var tracking = this._getTracking(obj),
                changes = tracking.changes || (tracking.changes = {
                    original: {},
                    children: {}
                }),
                childId = this._getTrackingId(child);

            changes.children[childId] = childId;
        },

        _clearChanges: function (obj) {
            var tracking = this._getTracking(obj),
                changes = tracking.changes;

            if (changes) {
                tracking.changes = null;
                if (!tracking.active) {
                    this._deleteTracking(obj);
                }
                this._triggerEvent("change", obj, false);
                var self = this;
                $.each(changes.children, function (key, value) {
                    self._clearChanges(self._tracked[value].obj);
                });
            }
        },

        _getOriginalValue: function (obj, type, property) {
            if (upshot.isArray(obj) && property) {
                throw "property is not a supported parameter when getting original array values";
            }

            var self = this,
                changes = this._getChanges(obj),
                original;

            if (property) {
                return this._getOriginalValue(
                    changes && changes.original.hasOwnProperty(property) ? changes.original[property] : obs.getProperty(obj, property),
                    upshot.metadata.getPropertyType(type, property));
            } else if (upshot.isArray(obj)) {
                original = (changes ? changes.original || obj : obj).slice(0);
                $.each(original, function (index, value) {
                    original[index] = self._getOriginalValue(value, type);
                });
                return original;
            } else if (upshot.isObject(obj)) {
                original = {};
                $.each(upshot.metadata.getProperties(obj, type), function (index, prop) {
                    var value = changes && changes.original && changes.original.hasOwnProperty(prop.name) ? changes.original[prop.name] : obs.getProperty(obj, prop.name);
                    original[prop.name] = self._getOriginalValue(value, prop.type);
                });
                return original;
            }
            return obj;
        },

        _restoreOriginalValues: function (obj, type, property) {
            if (upshot.isArray(obj) && property) {
                throw "property is not a supported parameter when restoring array values";
            }

            var changes = this._getChanges(obj);

            if (changes) {
                var self = this;
                if (property) {
                    if (changes.original.hasOwnProperty(property)) {
                        var originalValue = changes.original[property];
                        // Delete this before _setProperty, so isPropertyChanged/hasChanges is accurate during 
                        // property changed callbacks.
                        delete changes.original[property];
                        this._setProperty(obj, type, property, originalValue);
                    }
                    // TODO: Review.  Do we want revertChange(entity, propertyName) to be deep by default?  Opt-in?
                    // Do we not want a more general revertChange(obj, propertyName)?
                    // Will there be multiple children for a given propertyName (some detached/inactive)?
                    $.each(changes.children, function (key, value) {
                        var tracking = self._tracked[value];
                        if (tracking.property === property) {
                            self._restoreOriginalValues(tracking.obj, tracking.type, null);
                        }
                    });
                } else {
                    if (upshot.isArray(obj)) {
                        if (changes.original !== null) {
                            self._arrayRefresh(obj, type, changes.original);
                        }
                    } else {
                        // Develop stable keys so we can GC from changes.original as we restore.
                        var keys = [];
                        $.each(changes.original, function (key) { keys.push(key); });

                        $.each(keys, function (index, key) {
                            var value = changes.original[key];
                            // Delete this before _setProperty, so isPropertyChanged/hasChanges is accurate during 
                            // property changed callbacks.
                            delete changes.original[key];
                            self._setProperty(obj, type, key, value);
                        });
                    }

                    $.each(changes.children, function (key, value) {
                        var tracking = self._tracked[value];
                        self._restoreOriginalValues(tracking.obj, tracking.type, null);
                    });

                    this._clearChanges(obj);
                }
            }
        },

        _merge: function (entity, _new) {
            if (!this.hasChanges(entity)) {
                // Only merge entities without changes
                this._mergeObject(entity, _new, this._entityType);
            }
            return entity;
        },

        _mergeObject: function (obj, _new, type) {
            ///#DEBUG
            // TODO: For unmanaged associations, we'll need to descend into associations below to
            // pick up child association membership changes and parent association value changes.
            upshot.assert(this._dataContext.__manageAssociations);
            ///#ENDDEBUG

            var self = this;
            $.each(upshot.metadata.getProperties(_new, type, false /* see TODO above */), function (index, prop) {
                var oldValue = obs.getProperty(obj, prop.name),
                    value = obs.getProperty(_new, prop.name);
                if (oldValue !== value) {
                    if (upshot.classof(oldValue) === upshot.classof(value)) {
                        // We only try to deep-merge when classes match
                        if (upshot.isArray(oldValue) &&
                            (oldValue.length > 0 ? upshot.isObject(oldValue[0]) : upshot.isObject(value[0]))) {
                            // We only deep-merge arrays that contain objects
                            // TODO: Revisit this.  What's the rationale?
                            self._mergeArray(oldValue, value, prop.type);
                            return;
                        } else if (upshot.isObject(oldValue)) {
                            self._mergeObject(oldValue, value, prop.type);
                            return;
                        }
                    }
                    self._setProperty(obj, type, prop.name, value);
                }
            });
        },

        _mergeArray: function (array, _new, type) {
            var self = this;
            $.each(_new, function (index, value) {
                var oldValue = array[index];
                if (oldValue) {
                    self._mergeObject(oldValue, value, type);
                }
            });
            if (array.length > _new.length) {
                this._arrayRemove(array, type, _new.length, array.length - _new.length);
            } else if (array.length < _new.length) {
                this._arrayInsert(array, type, array.length, _new.slice(array.length));
            }
        },

        // NOTE: "Internal" suffix disambiguates _handleArrayChangeInternal/_handlePropertyChangeInternal
        // from base class _handleArrayChange method.
        _handlePropertyChangeInternal: function (entity, eventArguments, raisePropertyChanged) {
            // TODO, suwatch: to support N properties
            var path, value;
            for (var propertyName in eventArguments.newValues) {
                if (eventArguments.newValues.hasOwnProperty(propertyName)) {
                    if (path) {
                        throw "NYI -- Can only update one property at a time.";
                    }
                    path = propertyName;
                    value = eventArguments.newValues[propertyName];
                }
            }

            if (path === "") {
                // Data-linking sends all <input> changes to the linked object.
                return;
            }

            if (raisePropertyChanged) {
                this._trigger("propertyChanged", entity, path, value);
                // Issue the "entity change" event prior to any related "entity state changed" event below...
            }

            this._changeEntityStateForUpdate(entity);
        },

        // NOTE: "Internal" suffix disambiguates _handleArrayChangeInternal/_handlePropertyChangeInternal
        // from base class _handleArrayChange method.
        _handleArrayChangeInternal: function (entity) {
            this._changeEntityStateForUpdate(entity);
        },

        _setProperty: function (obj, type, key, value) {
            var parentId = this._getTracking(obj).parentId;

            this._removeTracking([obs.getProperty(obj, key)]);
            obs.setProperty(obj, key, value);  // TODO: Shouldn't we be _addTracking before obs.setProperty, so we won't be reentered in a inconsistent state?
            this._addTracking([value], upshot.metadata.getPropertyType(type, key), obj, key);
            if (parentId === null) {
                // Only raise "propertyChanged" for entity-level property changes.
                this._trigger("propertyChanged", obj, key, value);
            }
            this._triggerEvent("change", obj, true); // TODO -- can we untie this from property changes?
            // TODO: Why doesn't this "change" bubble like tracked changes ones?
        },

        _arrayRefresh: function (array, type, values) {
            this._removeTracking(array);
            obs.refresh(array, values);
            this._addTracking(array, type, array);
        },

        _arrayRemove: function (array, type, index, numToRemove) {
            this._removeTracking(array.slice(index, numToRemove));
            obs.remove(array, index, numToRemove);
        },

        _arrayInsert: function (array, type, index, items) {
            obs.insert(array, index, items);
            this._addTracking(items, type, array);
        },

        _getAddedEntityFromId: function (id) {
            var addedEntities = $.grep(this._addedEntities, function (addedEntity) { return addedEntity.clientId === id; });
            ///#DEBUG
            upshot.assert(addedEntities.length <= 1);
            ///#ENDDEBUG
            return addedEntities[0];
        },

        _getAddedEntityFromEntity: function (entity) {
            var addedEntities = $.grep(this._addedEntities, function (addedEntity) { return addedEntity.entity === entity; });
            ///#DEBUG
            upshot.assert(addedEntities.length <= 1);
            ///#ENDDEBUG
            return addedEntities[0];
        },

        _handleSubmitSucceeded: function (id, operation, result) {
            var entity = this._getEntityFromId(id);  // ...before we purge.

            switch (operation.Operation) {
                case 2:
                    // Do this before the model change, so listeners on data change events see consistent entity state.
                    this._updateEntityState(id, upshot.EntityState.Unmodified);

                    // Keep entity in addedEntities to maintain its synthetic id as the client-known id.
                    var addedEntity = this._getAddedEntityFromId(id);
                    var identity = this._getEntityIdentity(result.Entity);
                    addedEntity.serverId = identity;

                    this._serverEntities.push({ entity: addedEntity.entity, identity: identity });
                    this._clearChanges(addedEntity.entity);
                    this._merge(addedEntity.entity, result.Entity);
                    break;

                case 3:
                    // Do this before the model change, so listeners on data change events see consistent entity state.
                    this._updateEntityState(id, upshot.EntityState.Unmodified);

                    this._clearChanges(entity);
                    this._merge(entity, result.Entity);
                    break;

                case 4:
                    // Do this before the model change, so listeners on data change events see consistent entity state.
                    this._updateEntityState(id, upshot.EntityState.Deleted, null, entity);

                    var indexToPurge = this._getEntityIndexFromId(id);
                    this._purgeEntityAtIndex(indexToPurge, true);
                    break;
            }

            ///#DEBUG
            upshot.assert(!this.getEntityError(entity), "must not have error!");
            ///#ENDDEBUG
        },

        _handleSubmitFailed: function (id, operation, error) {
            var entity = this._getEntityFromId(id);

            var state;
            switch (operation.Operation) {
                case 2: state = upshot.EntityState.ClientAdded; break;
                case 3: state = upshot.EntityState.ClientUpdated; break;
                case 4: state = upshot.EntityState.ClientDeleted; break;
            }

            this._updateEntityState(id, state, error);
        },

        _purgeUncommittedAddedEntity: function (addedEntityBeingPurged) {
            var id = addedEntityBeingPurged.clientId,
                entity = addedEntityBeingPurged.entity;

            // Do this before the model change, so listeners on data change events see consistent entity state.
            this._updateEntityState(id, upshot.EntityState.Deleted, null, entity);

            // Remove our observable extensions from the entity being purged.
            this._removeTracking([entity]);
            this._addedEntities = $.grep(this._addedEntities, function (addedEntity) { return addedEntity !== addedEntityBeingPurged; });
            delete this._entityStates[id];
            this._disposeAssociationEntitiesViews(id);
            this._purgeEntity(entity);
        },

        _getEntityFromId: function (id) {
            // Similar logic as _getEntityIndexFromId
            var addedEntity = this._getAddedEntityFromId(id),
                idToFind;
            if (!addedEntity) {
                idToFind = id;
            } else if (addedEntity.serverId === undefined) {
                return addedEntity.entity;
            } else {
                idToFind = addedEntity.serverId;
            }

            for (var i = 0; i < this._serverEntities.length; i++) {
                if (this._serverEntities[i].identity === idToFind) {
                    return this._serverEntities[i].entity;
                }
            }
        },

        _addAssociationProperties: function (entity) {
            if (!this._dataContext.__manageAssociations) {
                return;
            }

            var fieldsMetadata = (upshot.metadata(this._entityType) || {}).fields;
            if (fieldsMetadata) {
                var id = this.getEntityId(entity);
                ///#DEBUG
                upshot.assert(id !== null && id in this._entityStates, "Entity should be cached in data context.");
                ///#ENDDEBUG

                var associatedEntitiesViews = this._associatedEntitiesViews[id] = {},
                    self = this;
                $.each(fieldsMetadata, function (fieldName, fieldMetadata) {
                    if (fieldMetadata.association) {
                        if (associatedEntitiesViews[fieldName]) {
                            throw "Duplicate property metadata for property '" + fieldName + "'.";
                        }
                        associatedEntitiesViews[fieldName] = self._createAssociatedEntitiesView(entity, fieldName, fieldMetadata);
                    }
                });
            }
        },

        _createAssociatedEntitiesView: function (entity, fieldName, fieldMetadata) {
            if (!fieldMetadata.association.isForeignKey && !fieldMetadata.array) {
                // TODO -- Singleton child entities?
                throw "NYI: Singleton child entities are not currently supported";
            }

            var targetEntitySet = this._dataContext.getEntitySet(fieldMetadata.type),
                isForeignKey = fieldMetadata.association.isForeignKey,
                parentPropertySetter = isForeignKey ? function () {  // AssociatedEntitiesView for a parent property needs a function to do the property set.
                    var oldParent = obs.getProperty(entity, fieldName),
                    newParent = obs.asArray(this.getEntities())[0] || null;  // TODO: What if there are N>1 parent entities?
                    if (oldParent !== newParent) {
                        // TODO: For KO, this won't be an observable set if KO's map didn't already establish a observable property here.  Is this ok?
                        obs.setProperty(entity, fieldName, newParent);
                        this._trigger("propertyChanged", entity, fieldName, newParent);
                    }
                } : null,
                parentEntitySet = isForeignKey ? targetEntitySet : this,
                childEntitySet = isForeignKey ? this : targetEntitySet;

            var result;
            if (fieldMetadata.array) {
                // TODO: We can't reuse an existing KO observable array here.  Without more work, that will double-track
                // the reused KO observable array (once, during obs.track of entity...a second time in the EntitySource ctor).
                result = obs.createCollection();

                // TODO: KO's obs.setProperty doesn't do what we want here.  It will set an already existing KO observable array to
                // have a value which is _another_ observable array.
                entity[fieldName] = result;
            }

            return new upshot.AssociatedEntitiesView(entity, parentEntitySet, childEntitySet, fieldMetadata.association, parentPropertySetter, result);
        },

        _disposeAssociationEntitiesViews: function (id) {
            var associatedEntitiesViews = this._associatedEntitiesViews[id];
            if (associatedEntitiesViews) {
                $.each(associatedEntitiesViews, function (unused, associatedEntitiesView) {
                    associatedEntitiesView.dispose();
                });
            }
            delete this._associatedEntitiesViews[id];
        },

        _getSerializableEntity: function (entity) {
            if (!this._dataContext.__manageAssociations) {
                return entity;
            }

            var sanitizedEntity = {};
            $.each(upshot.metadata.getProperties(entity, this._entityType), function (index, property) {
                sanitizedEntity[property.name] = entity[property.name];
            });
            return sanitizedEntity;
        }
    };

    var classMembers = {
        __getIdentity: function (entity, entityType) {
            // Produce a unique identity string for the given entity, based on simple
            // concatenation of key values.
            var metadata = upshot.metadata(entityType);
            if (!metadata) {
                throw "No metadata available for type '" + entityType + "'.  Register metadata using 'upshot.metadata(...)'.";
            }
            var keys = metadata.key;
            if (!keys) {
                throw "No key metadata specified for entity type '" + entityType + "'";
            }

            // optimize for the common single part key case
            if (keys.length == 1 && (keys[0].indexOf('.') == -1)) {
                var keyMember = keys[0];
                upshot.EntitySet.__validateKeyMember(keyMember, keyMember, entity, entityType);
                return obs.getProperty(entity, keyMember).toString();
            }

            var identity = "";
            $.each(keys, function (index, key) {
                if (identity.length > 0) {
                    identity += ",";
                }

                // support dotted paths
                var parts = key.split(".")
                var value = entity;
                $.each(parts, function (index, part) {
                    upshot.EntitySet.__validateKeyMember(part, key, value, entityType);
                    value = obs.getProperty(value, part);
                });

                identity += value;
            });
            return identity;
        },

        __validateKeyMember: function (keyMember, fullKey, entity, entityType) {
            if (!entity || !(keyMember in entity)) {
                throw "Key member '" + fullKey + "' doesn't exist on entity type '" + entityType + "'";
            }
        }
    };

    upshot.EntitySet = upshot.deriveClass(base, ctor, instanceMembers);

    $.extend(upshot.EntitySet, classMembers);
}
)(this, jQuery, upshot);

///
/// DataContext.js
///

(function (global, $, upshot, undefined)
{
    var obs = upshot.observability;

    var ctor = function (dataProvider, implicitCommitHandler, mappings) {

        // support no new ctor
        if (this._trigger === undefined) {
            return new upshot.DataContext(dataProvider, implicitCommitHandler);
        }

        this._dataProvider = dataProvider;
        this.__manageAssociations = true;  // TODO: Make this configurable by the app.  Fix unmanaged associations.
        this._implicitCommitHandler = implicitCommitHandler;

        this._eventCallbacks = {};
        this._entitySets = {};

        this._mappings = {};
        if (mappings) {
            this.addMapping(mappings);
        }
    };

    function getProviderParameters(type, parameters) {
        var result;
        if (parameters) {
            // first include any explicit get/submit
            // param properties
            result = $.extend(result, parameters[type] || {});

            // next, add any additional "outer" properties
            for (var prop in parameters) {
                if (prop !== "get" && prop !== "submit") {
                    result[prop] = parameters[prop];
                }
            }
        }
        return result;
    }

    var instanceMembers = {

        // Public methods

        dispose: function () {
            /// <summary>
            /// Disposes the DataContext instance.
            /// </summary>

            if (this._entitySets) {  // Use _entitySets as an indicator as to whether we've been disposed.
                $.each(this._entitySets, function (index, entitySet) {
                    entitySet.__dispose();
                });
                this._entitySets = null;
            }
        },

        // TODO: bind/unbind/_trigger are duplicated in EntitySource and DataContext, consider common routine.
        bind: function (event, callback) {
            /// <summary>
            /// Registers the supplied callback to be called when an event is raised.
            /// </summary>
            /// <param name="event" type="String">
            /// &#10;The event name.
            /// </param>
            /// <param name="callback" type="Function">
            /// &#10;The callback function.
            /// </param>
            /// <returns type="upshot.DataContext"/>

            if (typeof event === "string") {
                var list = this._eventCallbacks[event] || (this._eventCallbacks[event] = []);
                list.push(callback);
            } else {
                for (var key in event) {
                    this.bind(key, event[key]);
                }
            }
            return this;
        },

        unbind: function (event, callback) {
            /// <summary>
            /// Deregisters the supplied callback for the supplied event.
            /// </summary>
            /// <param name="event" type="String">
            /// &#10;The event name.
            /// </param>
            /// <param name="callback" type="Function">
            /// &#10;The callback function to be deregistered.
            /// </param>
            /// <returns type="upshot.DataContext"/>

            if (typeof event === "string") {
                var list = this._eventCallbacks[event];
                if (list) {
                    for (var i = 0, l = list.length; i < l; i++) {
                        if (list[i] === callback) {
                            list.splice(i, 1);
                            break;
                        }
                    }
                }
            } else {
                for (var key in event) {
                    this.unbind(key, event[key]);
                }
            }
            return this;
        },

        addMapping: function (entityType, mapping) {  // TODO: Should we support CTs here too?  Or take steps to disallow?
            // TODO: Need doc comments.

            if (typeof entityType === "string") {
                var mappingT = mapping;
                mapping = {};
                mapping[entityType] = mappingT;
            } else {
                mapping = entityType;
            }

            var self = this;
            $.each(mapping, function (entityType, mapping) {
                if ($.isFunction(mapping)) {
                    mapping = { map: mapping };
                }

                var existingMapping = self._mappings[entityType];
                if (!existingMapping) {
                    var entitySet = self._entitySets[entityType];
                    if (entitySet && entitySet.getEntities().length > 0) {
                        throw "Supply a mapping for a type before loading data of that type";
                    }
                    self._mappings[entityType] = { map: mapping.map, unmap: mapping.unmap };
                } else if (existingMapping.map !== mapping.map || existingMapping.unmap !== mapping.unmap) {
                    throw "For a given type, DataContext.addMapping must be supplied the same map/unmap functions.";
                }
            });
        },

        getEntitySet: function (entityType) {
            /// <summary>
            /// Returns the EntitySet for the supplied type.
            /// </summary>
            /// <param name="entityType" type="String"/>
            /// <returns type="upshot.EntitySet"/>

            var entitySet = this._entitySets[entityType];
            if (!entitySet) {
                entitySet = this._entitySets[entityType] = new upshot.EntitySet(this, entityType);
            }
            return entitySet;
        },

        getEntityErrors: function () {
            /// <summary>
            /// Returns an array of server errors by entity, of the form [ &#123; entity: &#60;entity&#62;, error: &#60;object&#62; &#125;, ... ].
            /// </summary>
            /// <returns type="Array"/>

            var errors = [];
            $.each(this._entitySets, function (type, entitySet) {
                var spliceArguments = [errors.length, 0].concat(entitySet.getEntityErrors());
                [ ].splice.apply(errors, spliceArguments);
            });
            return errors;
        },

        getEntityError: function (entity) {
            /// <summary>
            /// Returns server errors for the supplied entity.
            /// </summary>
            /// <param name="entity" type="Object">
            /// &#10;The entity for which server errors are to be returned.
            /// </param>
            /// <returns type="Object"/>

            var error;
            // TODO: we should get related-entitySet for an entity, then getEntityError.
            // this will need type rationalization across all providers.
            $.each(this._entitySets, function (unused, entitySet) {
                error = entitySet.getEntityError(entity);
                return !error;
            });
            return error;
        },

        commitChanges: function (options, success, error) {
            /// <summary>
            /// Initiates an asynchronous commit of any model data edits collected by this DataContext.
            /// </summary>
            /// <param name="success" type="Function" optional="true">
            /// &#10;A success callback.
            /// </param>
            /// <param name="error" type="Function" optional="true">
            /// &#10;An error callback with signature function(httpStatus, errorText, context).
            /// </param>
            /// <returns type="upshot.DataContext"/>

            if (this._implicitCommitHandler) {
                throw "Data context must be in change-tracking mode to explicitly commit changes.";
            }
            this._commitChanges(options, success, error);
            return this;
        },

        revertChanges: function () {
            /// <summary>
            /// Reverts any edits to model data (to entities) back to original entity values.
            /// </summary>
            /// <returns type="upshot.DataContext"/>

            $.each(this._entitySets, function (type, entitySet) {
                entitySet.__revertChanges();
            });
            upshot.__triggerRecompute();
            return this;
        },

        merge: function (entities, type, includedEntities) {
            /// <summary>Merges data into the cache</summary>
            /// <param name="entities" type="Array">The array of entities to add or merge into the cache</param>
            /// <param name="type" type="String">The type of the entities to be merge into the cache. This parameter can be null/undefined when no entities are supplied</param>
            /// <param name="includedEntities" type="Array">An additional array of entities (possibly related) to add or merge into the cache.  These entities will not be returned from this function. This parameter is optional</param>
            /// <returns type="Array">The array of entities with newly merged values</returns>

            var self = this;
            includedEntities = includedEntities || {};

            $.each(entities, function (unused, entity) {
                // apply type info to the entity instances
                // TODO: Do we want this to go through the compatibility layer?
                obs.setProperty(entity, "__type", type);

                self.__flatten(entity, type, includedEntities);
            });

            $.each(includedEntities, function (type, entities) {
                $.each(entities, function (unused, entity) {
                    // apply type info to the entity instances
                    // TODO: Do we want this to go through the compatibility layer?
                    obs.setProperty(entity, "__type", type);
                });

                // TODO -- Add CT + shredding support
                var entitySet = self.getEntitySet(type);
                entitySet.__loadEntities(entities);
            });

            var entitySet = type && this.getEntitySet(type),
                mergedEntities = entitySet ? entitySet.__loadEntities(entities) : [];

            upshot.__triggerRecompute();

            return mergedEntities;
        },

        // TODO -- We have no mechanism to similarly clear data sources.
        //// clear: function () {
        ////     $.each(this._entitySets, function (type, entitySet) {
        ////         entitySet.__clear();
        ////     });
        //// },

        // Internal methods

        // recursively visit the specified entity and its associations, accumulating all
        // associated entities to the included entities collection
        __flatten: function (entity, entityType, includedEntities) {
            var self = this;

            $.each(upshot.metadata.getProperties(entity, entityType, true), function (index, prop) {
                var value = obs.getProperty(entity, prop.name);
                if (value) {
                    if (prop.association) {
                        var associatedEntities = upshot.isArray(value) ? value : [value],
                            associatedEntityType = prop.type,
                            entities = includedEntities[associatedEntityType] || (includedEntities[associatedEntityType] = []);

                        $.each(associatedEntities, function (inner_index, associatedEntity) {
                            // add the associated entity
                            var identity = upshot.EntitySet.__getIdentity(associatedEntity, associatedEntityType);

                            if (!entities.identityMap) {
                                entities.identityMap = {};
                            }
                            if (!entities.identityMap[identity]) {
                                // add the entity and recursively flatten it
                                entities.identityMap[identity] = true;
                                entities.push(associatedEntity);
                                self.__flatten(associatedEntity, associatedEntityType, includedEntities);
                            }
                            ///#DEBUG
                            // TODO: For unmanaged associations, where is it that we should fix up internal reference
                            // refer only to the atomized entity for a given identity?
                            upshot.assert(self.__manageAssociations);
                            ///#ENDDEBUG
                        });
                    }
                }
            });
        },

        __load: function (options, success, error) {

            $.each(this._entitySets, function (type, entitySet) {
                if (entitySet.__hasUncommittedEdits()) {
                    throw "Load is not allowed while the data source contains uncommitted edits.";
                }
            });

            var dataProvider = this._dataProvider,
                self = this,
                onSuccess = function (result) {
                    // add metadata if specified
                    if (result.metadata) {
                        upshot.metadata(result.metadata);
                    }

                    // determine the result type
                    var entityType = result.type || options.entityType;
                    if (!entityType) {
                        throw "Unable to determine entity type.";
                    }

                    var entities = $.map(result.entities, function (entity) {
                        return self._mapEntity(entity, entityType);
                    });
                    var includedEntities;
                    if (result.includedEntities) {
                        includedEntities = {};
                        $.each(result.includedEntities, function (type, entities) {
                            includedEntities[type] = $.map(entities, function (entity) {
                                return self._mapEntity(entity, type);
                            });
                        });
                    }

                    var mergedEntities = self.merge(entities, entityType, includedEntities);

                    success.call(self, self.getEntitySet(entityType), mergedEntities, result.totalCount);
                },
                onError = function (httpStatus, errorText, context) {
                    error.call(self, httpStatus, errorText, context);
                };

            var getParameters = getProviderParameters("get", options.providerParameters);

            dataProvider.get(getParameters, options.queryParameters, onSuccess, onError);
        },

        __queueImplicitCommit: function () {
            if (this._implicitCommitHandler) {
                // when in implicit commit mode, we group all implicit commits within
                // a single thread of execution by queueing a timer callback that expires
                // immediately.
                if (!this._implicitCommitQueued) {
                    this._implicitCommitQueued = true;

                    var self = this;
                    setTimeout(function () {
                        self._implicitCommitQueued = false;
                        self._implicitCommitHandler();
                    }, 0);
                }
            }
        },

        // Private methods

        _trigger: function (eventType) {
            var list = this._eventCallbacks[eventType];
            if (list) {
                var args = Array.prototype.slice.call(arguments, 1);
                // clone the list to be robust against bind/unbind during callback
                list = list.slice(0);
                for (var i = 0, l = list.length; i < l; i++) {
                    list[i].apply(this, args);
                }
            }
            return this;
        },

        _submitChanges: function (options, editedEntities, success, error) {

            this._trigger("commitStart");

            var edits = $.map(editedEntities, function (editedEntity) {
                return editedEntity.entitySet.__getEntityEdit(editedEntity.entity);
            });

            $.each(edits, function (index, edit) { edit.updateEntityState(); });

            var self = this;
            var mapChange = function (entity, entityType, result) {
                var change = {
                    Id: result.Id,
                    Operation: result.Operation
                };
                if (result.Operation !== 4) { // Only add/update operations require mapped entity.
                    change.Entity = self._mapEntity(result.Entity, entityType);
                }
                return change;
            };

            var unmapChange = function (index, entityType, operation) {
                var change = {
                    Id: index.toString(),
                    Operation: operation.Operation,
                    Entity: operation.Entity,
                    OriginalEntity: operation.OriginalEntity
                };
                if (operation.Operation !== 4) { // Delete operations don't require unmapping
                    var unmap = (self._mappings[entityType] || {}).unmap || obs.unmap;
                    change.Entity = unmap(operation.Entity, entityType);
                }
                return change;
            };

            var changeSet = $.map(edits, function (edit, index) {
                return unmapChange(index, edit.entityType, edit.operation);
            });

            var onSuccess = function (submitResult) {
                    // all updates in the changeset where successful
                    $.each(edits, function (index, edit) {
                        edit.succeeded(mapChange(edit.storeEntity, edit.entityType, submitResult[index]));
                    });
                    upshot.__triggerRecompute();
                    self._trigger("commitSuccess", submitResult);
                    if (success) {
                        success.call(self, submitResult);
                    }
                },
                onError = function (httpStatus, errorText, context, submitResult) {
                    // one or more updates in the changeset failed
                    $.each(edits, function (index, edit) {
                        if (submitResult) {
                            // if a submitResult was provided, we use that data in the
                            // completion of the edit
                            var editResult = submitResult[index];
                            if (editResult.Error) {
                                edit.failed(editResult.Error);
                            } else {
                                // even though there were failures in the changeset,
                                // this particular edit is marked as completed, so
                                // we need to accept changes for it
                                edit.succeeded(mapChange(edit.storeEntity, edit.entityType, editResult));
                            }
                        } else {
                            // if we don't have a submitResult, we still need to state
                            // transition the edit properly
                            edit.failed(null);
                        }
                    });

                    upshot.__triggerRecompute();
                    self._trigger("commitError", httpStatus, errorText, context, submitResult);
                    if (error) {
                        error.call(self, httpStatus, errorText, context, submitResult);
                    }
                };

            var submitParameters = getProviderParameters("submit", options.providerParameters);

            this._dataProvider.submit(submitParameters, changeSet, onSuccess, onError);
        },

        _commitChanges: function (options, success, error) {
            var editedEntities = [];
            $.each(this._entitySets, function (type, entitySet) {
                var entities = $.map(entitySet.__getEditedEntities(), function (entity) {
                    return { entitySet: entitySet, entity: entity };
                });
                [ ].push.apply(editedEntities, entities);
            });

            this._submitChanges(options, editedEntities, success, error);
            upshot.__triggerRecompute();
        },

        _mapEntity: function (data, entityType) {
            return this._map(data, entityType, true);
        },

        _map: function (data, entityType, isObject) {
            if (isObject || upshot.isObject(data)) {
                var map = (this._mappings[entityType] || {}).map;
                if (map) {
                    // Don't pass "entityType"/"mapNested" as we do below for obs.map.
                    // This would pollute the signature for app-supplied map functions (especially 
                    // when ctors are supplied).
                    return new map(data);  // Use "new" here to allow ctors to be passed as map functions.
                }
            }

            // The "map" function provided by the observability layer takes a function
            // to map nested objects, so we take advantage of app-supplied mapping functions.
            var self = this,
                mapNested = function (data, entityType) {
                    return self._map(data, entityType);
                };
            return obs.map(data, entityType, mapNested);
        }
    };

    upshot.DataContext = upshot.defineClass(ctor, instanceMembers);

}
)(this, jQuery, upshot);

///
/// DataProvider.js
///

(function (global, $, upshot, undefined)
{
    function getQueryResult(getResult, wrappedResult) {
        var entities, totalCount;

        if (wrappedResult) {
            entities = getResult.Results;
            totalCount = getResult.TotalCount;
        }
        else {
            entities = getResult;
        }

        return {
            entities: upshot.isArray(entities) ? entities : [entities],
            totalCount: totalCount
        };
    }

    var instanceMembers = {

        // Public methods

        get: function (parameters, queryParameters, success, error) {
            /// <summary>
            /// Asynchronously gets data from the server using the specified parameters
            /// </summary>
            /// <param name="parameters" type="String">The get parameters</param>
            /// <param name="queryParameters" type="Object">An object where each property is a query to pass to the operation. This parameter is optional.</param>
            /// <param name="success" type="Function">Optional success callback</param>
            /// <param name="error" type="Function">Optional error callback</param>
            /// <returns type="Promise">A Promise representing the result of the load operation</returns>

            var operation, operationParameters;
            if (parameters) {
                operation = parameters.operationName;
                operationParameters = parameters.operationParameters;
            }

            if ($.isFunction(operationParameters)) {
                success = operationParameters;
                error = queryParameters;
            }

            var self = this;

            // set up the request parameters
            var url = upshot.DataProvider.normalizeUrl(parameters.url) + operation;
            var oDataQueryParams = upshot.ODataDataProvider.getODataQueryParameters(queryParameters);
            var data = $.extend({}, operationParameters, oDataQueryParams);
            var wrappedResult = oDataQueryParams.$inlinecount == "allpages";

            // invoke the query
            $.ajax({
                url: url,
                data: data,
                success: success && function () {
                    arguments[0] = getQueryResult(arguments[0], wrappedResult);
                    success.apply(self, arguments);
                },
                error: error && function (jqXHR, statusText, errorText) {
                    error.call(self, jqXHR.status, self._parseErrorText(jqXHR.responseText) || errorText, jqXHR);
                },
                dataType: "json"
            });
        },

        submit: function (parameters, changeSet, success, error) {
            /// <summary>
            /// Asynchronously submits the specified changeset
            /// </summary>
            /// <param name="parameters" type="String">The submit parameters</param>
            /// <param name="changeSet" type="Object">The changeset to submit</param>
            /// <param name="success" type="Function">Optional success callback</param>
            /// <param name="error" type="Function">Optional error callback</param>
            /// <returns type="Promise">A Promise representing the result of the post operation</returns>

            $.each(changeSet, function (index, changeSetEntry) {
                switch (changeSetEntry.Operation) {
                    case 2: // insert
                        changeSetEntry.Operation = 1;
                        break;
                    case 3: // update
                        changeSetEntry.Operation = 2;
                        break;
                    case 4: // delete
                        changeSetEntry.Operation = 3;
                        break;
                };
            });

            var self = this,
                encodedChangeSet = JSON.stringify(changeSet);

            $.ajax({
                url: upshot.DataProvider.normalizeUrl(parameters.url) + "Submit",
                contentType: "application/json",
                data: encodedChangeSet,
                dataType: "json",
                type: "POST",
                success: (success || error) && function (data, statusText, jqXHR) {
                    var result = data;
                    var hasErrors = false;
                    if (result) {
                        // transform to Error property
                        $.each(result, function (index, changeSetEntry) {
                            // even though upshot currently doesn't support reporting of concurrency conflicts,
                            // we must still identify such failures
                            $.each(["ConflictMembers", "ValidationErrors", "IsDeleteConflict"], function (index, property) {
                                if (changeSetEntry.hasOwnProperty(property)) {
                                    changeSetEntry.Error = changeSetEntry.Error || {};
                                    changeSetEntry.Error[property] = changeSetEntry[property];
                                    hasErrors = true;
                                }
                            });
                        });
                    }

                    if (!hasErrors) {
                        if (success) {
                            success.call(self, result);
                        }
                    } else if (error) {
                        var errorText = "Submit failed.";
                        if (result) {
                            for (var i = 0; i < result.length; ++i) {
                                var validationError = (result[i].ValidationErrors && result[i].ValidationErrors[0] && result[i].ValidationErrors[0].Message);
                                if (validationError) {
                                    errorText = validationError;
                                    break;
                                }
                            }
                        }
                        error.call(self, jqXHR.status, errorText, jqXHR, result);
                    }
                },
                error: error && function (jqXHR, statusText, errorText) {
                    error.call(self, jqXHR.status, self._parseErrorText(jqXHR.responseText) || errorText, jqXHR);
                }
            });
        },

        _parseErrorText: function (responseText) {
            var match = /Exception]: (.+)\r/g.exec(responseText);
            if (match && match[1]) {
                return match[1];
            }
            if (/^{.*}$/g.test(responseText)) {
                var error = JSON.parse(responseText);
                // TODO: error.Message returned by DataController
                // Does ErrorMessage check still necessary?
                if (error.ErrorMessage) {
                    return error.ErrorMessage;
                } else if (error.Message) {
                    return error.Message;
                }
            }
        }
    }

    var classMembers = {
        normalizeUrl: function (url) {
            if (url && url.substring(url.length - 1) !== "/") {
                return url + "/";
            }
            return url;
        }
    }

    upshot.DataProvider = upshot.defineClass(null, instanceMembers, classMembers);
}
)(this, jQuery, upshot);

///
/// RemoteDataSource.js
///

(function (global, $, upshot, undefined)
{
    var base = upshot.DataSource.prototype;

    var ctor = function (options) {
        /// <summary>
        /// RemoteDataSource is used to load model data matching a query that is evaluated on the server.
        /// </summary>
        /// <param name="options" optional="true">
        /// Options used in the construction of the RemoteDataSource:
        ///     &#10;bufferChanges: (Optional) If 'true', edits to model data are buffered until RemoteDataSource.commitChanges.  Otherwise, edits are committed to the server immediately.
        ///     &#10;result: (Optional) The observable array into which the RemoteDataSource will load model data.
        ///     &#10;dataContext: (Optional) A DataContext instance that acts as a shared cache for multiple DataSource instances.  When not supplied, a DataContext instance is instantiated for this RemoteDataSource.
        ///     &#10;entityType: The type of model data that will be loaded by this RemoteDataSource instance.
        ///     &#10;provider: (Optional) Specifies the DataProvider that will be used to get model data and commit edits to the model data.  Defaults to upshot.DataProvider which works with System.Web.Http.Data.DataController.
        ///     &#10;providerParameters: (Optional) Parameters that are supplied to the DataProvider for this RemoteDataSource and used by the DataProvider when it gets model data from the server.
        ///     &#10;mapping: (Optional) A function (typically a constructor) used to translate raw model data loaded via the DataProvider into model data that will be surfaced by this RemoteDataSource.
        /// </param>

        // support no new ctor
        if (this._trigger === undefined) {
            return new upshot.RemoteDataSource(options);
        }

        // Optional query options
        this._sort = null;
        this._filters = null;

        var dataProvider, dataContext, mapping;
        if (options) {
            this._providerParameters = options.providerParameters;
            this._entityType = options.entityType;
            dataContext = options.dataContext;

            // support both specification of a provider instance as well as
            // a provider function. In the latter case, we create the provider
            // for the user
            if (!options.provider && !options.dataContext) {
                // we're in a remote scenario but no context or provider has been specified.
                // use our default provider in this case.
                dataProvider = upshot.DataProvider;
            } else {
                dataProvider = options.provider;
            }

            if ($.isFunction(dataProvider)) {
                dataProvider = new dataProvider();
            }

            mapping = options.mapping;
            if (mapping &&
                ($.isFunction(mapping) ||  // Mapping supplied as a "map" function.
                 ($.isFunction(mapping.map) || $.isFunction(mapping.unmap)))) {  // Mapping supplied as map/unmap functions.

                if (!this._entityType) {
                    // TODO: Build out the no-type scenario where the DataSource supplies a mapping
                    // function and our merge algorithm ignores any typing from the DataProvider.
                    throw "Need 'entityType' option in order to supply " +
                        ($.isFunction(mapping) ? "a function" : "map/unmap functions") +
                        " for 'mapping' option.";
                }

                var mappingForType = mapping;
                mapping = {};
                mapping[this._entityType] = mappingForType;
            }
        }

        var self = this;
        if (!dataContext) {
            var implicitCommitHandler;
            if (!options.bufferChanges) {
                // since we're not change tracking, define an implicit commit callback
                // and pass into the DC
                implicitCommitHandler = function () {
                    self._dataContext._commitChanges({ providerParameters: self._providerParameters });
                }
            }

            dataContext = new upshot.DataContext(dataProvider, implicitCommitHandler, mapping);
            // TODO -- If DS exclusively owns the DC, can we make it non-accumulating?
        } else if (mapping) {
            // This will throw if the app is supplying a different mapping for a given entityType.
            dataContext.addMapping(mapping);
        }

        this._dataContext = dataContext;

        // define commit[Start,Success,Error] observers
        var observer = {};
        $.each(["commitStart", "commitSuccess", "commitError"], function (unused, name) {
            observer[name] = function () {
                self._trigger.apply(self, [name].concat(Array.prototype.slice.call(arguments)));
            };
        });

        this._dataContextObserver = observer;
        this._dataContext.bind(this._dataContextObserver);

        var entitySource = options && options.entityType && this._dataContext.getEntitySet(options.entityType);
        if (entitySource) {
            options = $.extend({}, options, { source: entitySource });
        } else {
            // Until we can bindToEntitySource, fill in the DataContext-specific methods with some usable defaults.
            $.each(upshot.EntityView.__dataContextMethodNames, function (index, name) {
                if (name !== "getDataContext") {
                    self[name] = function () {
                        throw "DataContext-specific methods are not available on RemoteDataSource a result type can be determined.  Consider supplying the \"entityType\" option when creating a RemoteDataSource or execute an initial query against your RemoteDatasource to determine the result type.";
                    };
                }
            });
            this.getDataContext = function () {
                return this._dataContext;
            };
        }

        base.constructor.call(this, options);
    };

    var instanceMembers = {

        setSort: function (sort) {
            /// <summary>
            /// Establishes the sort specification that is to be applied as part of a server query when loading model data.
            /// </summary>
            /// <param name="sort">
            /// &#10;The sort specification to applied when loading model data.
            /// &#10;Should be supplied as an object of the form &#123; property: &#60;propertyName&#62; [, descending: &#60;bool&#62; ] &#125; or an array of ordered objects of this form.
            /// &#10;When supplied as null or undefined, the sort specification for this RemoteDataSource is cleared.
            /// </param>
            /// <returns type="upshot.RemoteDataSource"/>

            // TODO -- Validate sort specification?
            this._sort = (sort && !upshot.isArray(sort)) ? [sort] : sort;
            return this;
        },

        setFilter: function (filter) {
            /// <summary>
            /// Establishes the filter specification that is to be applied as part of a server query when loading model data.
            /// </summary>
            /// <param name="filter">
            /// &#10;The filter specification to applied when loading model data.
            /// &#10;Should be supplied as an object of the form &#123; property: &#60;propertyName&#62;, value: &#60;propertyValue&#62; [, operator: &#60;operator&#62; ] &#125; or an array of ordered objects of this form.
            /// &#10;When supplied as null or undefined, the filter specification for this RemoteDataSource is cleared.
            /// </param>
            /// <returns type="upshot.RemoteDataSource"/>

            this._filters = filter && this._normalizeFilters(filter);
            return this;
        },

        // TODO -- We should do a single setTimeout here instead, just in case N clients request a refresh
        // in response to callbacks.
        refresh: function (options, success, error) {
            /// <summary>
            /// Initiates an asynchronous get to load model data matching the query established with setSort, setFilter and setPaging.
            /// </summary>
            /// <param name="options" optional="true">
            /// &#10;There are no valid options recognized by RemoteDataSource.
            /// </param>
            /// <param name="success" type="Function" optional="true">
            /// &#10;A success callback with signature function(entities, totalCount).
            /// </param>
            /// <param name="error" type="Function" optional="true">
            /// &#10;An error callback with signature function(httpStatus, errorText, context).
            /// </param>
            /// <returns type="upshot.RemoteDataSource"/>

            if ($.isFunction(options)) {
                error = success;
                success = options;
                options = undefined;
            }

            this._trigger("refreshStart");

            var self = this,
                onSuccess = function (entitySet, entities, totalCount) {
                    self._bindToEntitySource(entitySet);
                    // TODO -- This means that we can't do CUD on this data source until we've refreshed it once.
                    // Allow client to pass the entityType, which would allow us to _not_ require a refresh to prime.

                    self._completeRefresh(entities, totalCount, success);
                },
                onError = function (httpStatus, errorText, context) {
                    self._failRefresh(httpStatus, errorText, context, error);
                };

            this._dataContext.__load({
                entityType: this._entityType,
                providerParameters: this._providerParameters,

                queryParameters: {
                    filters: this._filters,
                    sort: this._sort,
                    skip: this._skip,
                    take: this._take,
                    includeTotalCount: this._includeTotalCount
                }
            }, onSuccess, onError);
            return this;
        },

        commitChanges: function (success, error) {
            /// <summary>
            /// Initiates an asynchronous commit of any model data edits collected by the DataContext for this RemoteDataSource.
            /// </summary>
            /// <param name="success" type="Function" optional="true">
            /// &#10;A success callback.
            /// </param>
            /// <param name="error" type="Function" optional="true">
            /// &#10;An error callback with signature function(httpStatus, errorText, context).
            /// </param>
            /// <returns type="upshot.RemoteDataSource"/>

            this._dataContext.commitChanges({
                providerParameters: this._providerParameters
            }, $.proxy(success, this), $.proxy(error, this));
            return this;
        },


        // Private methods

        _dispose: function () {
            this._dataContext.unbind(this._dataContextObserver);
            base._dispose.apply(this, arguments);
        }

    };

    upshot.RemoteDataSource = upshot.deriveClass(base, ctor, instanceMembers);

}
)(this, jQuery, upshot);

///
/// AssociatedEntitiesView.js
///

(function (global, $, upshot, undefined)
{
    var base = upshot.EntityView.prototype;

    var obs = upshot.observability;

    var ctor = function (entity, parentEntitySet, childEntitySet, associationMetadata, parentPropertySetter, result) {
        this._entity = entity;
        this._parentEntitySet = parentEntitySet;
        this._childEntitySet = childEntitySet;
        this._associationMetadata = associationMetadata;
        this._parentPropertySetter = parentPropertySetter;

        // The EntityView base class observes its "source" option (which is the target entity set) for 
        // array- and property-changes.
        // Additionally, we need to observe property changes on the source entity set to catch:
        // - FK property changes that would affect a parent association property
        // - PK (non-FK) property changes that would affect a child association property
        var self = this;
        this._sourceEntitySetObserver = function (entity, property, newValue) {
            if (!self._needRecompute &&
                $.inArray(property, associationMetadata.thisKey) >= 0) {
                self._setNeedRecompute();
            }
        };
        var sourceEntitySet = associationMetadata.isForeignKey ? childEntitySet : parentEntitySet;
        sourceEntitySet.bind("propertyChanged", this._sourceEntitySetObserver);

        var entitySource = associationMetadata.isForeignKey ? parentEntitySet : childEntitySet;
        base.constructor.call(this, { source: entitySource, result: result });

        // We only ever instantiate AssociatedEntitiesViews when adding entities to 
        // an EntitySet, which always ends with a recompute.
        this._initialized = false;
        this._setNeedRecompute();
    };

    var instanceMembers = {

        // Internal methods

        // This is called from EntitySet.js as it treats tracked changes to parent association
        // properties on child entities.
        __handleParentPropertySet: function (parentEntity) {
            this._handleRelationshipEdit(this._entity, parentEntity);
        },

        // Private methods

        _dispose: function () {
            var sourceEntitySet = this._associationMetadata.isForeignKey ? this._childEntitySet : this._parentEntitySet;
            sourceEntitySet.unbind("propertyChanged", this._sourceEntitySetObserver);
            base._dispose.apply(this, arguments);
        },

        _handleEntityAdd: function (entity) {
            this._handleRelationshipEdit(entity, this._entity);
        },

        // Do the appropriate EntitySet adds and FK property changes to reflect an editied relationship
        // between childEntity and parentEntity.
        _handleRelationshipEdit: function (childEntity, parentEntity) {
            var associationMetadata = this._associationMetadata,
                isForeignKey = associationMetadata.isForeignKey,
                parentKeyValue;
            if (!parentEntity) {
                parentKeyValue = null;
            } else {
                if ($.inArray(parentEntity, obs.asArray(this._parentEntitySet.getEntities())) < 0) {
                    // TODO -- Should this implicitly add the parent entity?  I doubt it.
                    throw "Parent entity is not in the parent entity set for this association.";
                } else if ((this._parentEntitySet.getEntityState(parentEntity) || "").indexOf("Add") > 0) {
                    // TODO -- Add support for added parent entities without an established key value, fix-up after commit.
                    throw "NYI -- Cannot set foreign keys to key values computed from added entities.  Commit the parent entity first.";
                }

                var parentKey = isForeignKey ? associationMetadata.otherKey : associationMetadata.thisKey;
                parentKeyValue = obs.getProperty(parentEntity, parentKey[0]);  // TODO -- Generalize to N fields.
                if (parentKeyValue === undefined) {
                    throw "Parent entity has no value for its '" + parentKey[0] + "' key property.";
                }
            }

            var childKey = isForeignKey ? associationMetadata.thisKey : associationMetadata.otherKey,
                childKeyValue = obs.getProperty(childEntity, childKey[0]),  // TODO -- Generalize to N fields.
                setForeignKeyValue;
            if (!parentEntity) {
                if (childKeyValue !== null) {
                    setForeignKeyValue = true;
                }
            } else if (childKeyValue === undefined || childKeyValue !== parentKeyValue) {
                setForeignKeyValue = true;
            }

            var isAddToChildEntities = !isForeignKey;
            if (isAddToChildEntities && $.inArray(childEntity, obs.asArray(this._entitySource.getEntities())) < 0) {
                // Base class will translate add to child entities into an add on our input EntitySet.
                base._handleEntityAdd.call(this, childEntity);
            }

            if (setForeignKeyValue) {
                // Do this after the entitySet add above.  That way, the property change will be observable by clients
                // interested in childEntitiesCollection or the EntitySet.
                // Likewise, above, we will have done obs.track (as part of adding to the EntitySet) before 
                // obs.setProperty, in case establishing observable proxies is done implicitly w/in setProperty
                // (as WinJS support does).
                this._childEntitySet.__setProperty(childEntity, childKey[0], parentKeyValue);  // TODO -- Generalize to N fields.
            }
        },

        _onPropertyChanged: function (entity, property, newValue) {
            if (!this._needRecompute &&
                $.inArray(property, this._associationMetadata.otherKey) >= 0) {
                this._setNeedRecompute();
            }
            base._onPropertyChanged.apply(this, arguments);
        },

        _onArrayChanged: function (type, eventArgs) {
            if (this._needRecompute) {
                return;
            }

            var needRecompute;
            switch (type) {
                case "insert":
                case "remove":
                    var self = this;
                    $.each(eventArgs.items, function (index, entity) {
                        if (self._haveEntity(entity) ^ type === "insert") {
                            needRecompute = true;
                            return false;
                        }
                    });
                    break;

                case "replaceAll":
                    needRecompute = true;
                    break;

                default:
                    throw "NYI -- Array operation '" + type + "' is not supported.";
            }

            if (needRecompute) {
                this._setNeedRecompute();
            }
        },

        _recompute: function () {
            var clientEntities = this._clientEntities,
                newEntities = this._computeAssociatedEntities();

            if (!this._initialized) {
                this._initialized = true;

                if (newEntities.length > 0) {  // Don't event a replaceAll if we're not actually modifying the entities array.
                    var oldEntities = obs.asArray(clientEntities).slice();  // Here, assume a live array.  It will be for jQuery compat.
                    obs.refresh(clientEntities, newEntities);
                    this._trigger("arrayChanged", "replaceAll", { oldItems: oldEntities, newItems: obs.asArray(clientEntities) });
                }
            } else {
                // Perform adds/removes on clientEntities to have it reflect the same membership
                // as newEntities.  Issue change events for the adds/removes.
                // Don't try to preserve ordering between clientEntities and newEntities.
                // Assume that obs.asArray returns a non-live array instance.  It will be for Knockout compat.
                // Don't cache obs.asArray(clientEntities) below.
                var self = this;

                var addedEntities = $.grep(newEntities, function (entity) {
                    return $.inArray(entity, obs.asArray(clientEntities)) < 0;
                });
                $.each(addedEntities, function (unused, entity) {
                    var index = obs.asArray(clientEntities).length,
                        items = [entity];
                    obs.insert(clientEntities, index, items);
                    self._trigger("arrayChanged", "insert", { index: index, items: items });
                });

                var removedEntities = $.grep(obs.asArray(clientEntities), function (entity) {
                    return $.inArray(entity, newEntities) < 0;
                });
                $.each(removedEntities, function (unused, entity) {
                    var indexRemove = $.inArray(entity, obs.asArray(clientEntities));
                    obs.remove(clientEntities, indexRemove, 1);
                    self._trigger("arrayChanged", "remove", { index: indexRemove, items: [entity] });
                });
            }

            if (this._parentPropertySetter) {
                // EntitySet.js has supplied a handler with which to make observable changes
                // to a parent association property on a child entity.
                this._parentPropertySetter.apply(this);
            }
        },

        _computeAssociatedEntities: function () {
            var entity = this._entity,
                associationMetadata = this._associationMetadata,
                sourceKeyValue = obs.getProperty(entity, associationMetadata.thisKey[0]),  // TODO -- Generalize to N fields.
                targetEntitySet = associationMetadata.isForeignKey ? this._parentEntitySet : this._childEntitySet,
                targetEntities = obs.asArray(targetEntitySet.getEntities()),
                targetKey = associationMetadata.otherKey,
                associatedEntities = [];
            for (var i = 0; i < targetEntities.length; i++) {
                var targetEntity = targetEntities[i],
                    targetKeyValue = obs.getProperty(targetEntity, targetKey[0]);  // TODO -- Generalize to N fields.
                if (targetKeyValue !== undefined && targetKeyValue === sourceKeyValue) {
                    associatedEntities.push(targetEntity);
                }
            }
            return associatedEntities;
        }

        // TODO -- Make array removals from "_clientEntities" null out foreign key values.
    };

    upshot.AssociatedEntitiesView = upshot.deriveClass(base, ctor, instanceMembers);
}
)(this, jQuery, upshot);

///
/// LocalDataSource.js
///

(function (global, $, upshot, undefined)
{
    var base = upshot.DataSource.prototype;

    var obs = upshot.observability;

    var ctor = function (options) {
        /// <summary>
        /// LocalDataSource is used to load model data matching a query that is evaluated in-memory.
        /// </summary>
        /// <param name="options" optional="true">
        /// Options used in the construction of the LocalDataSource:
        ///     &#10;source: The input data which is to be sorted, filtered and paged to produce the output for this LocalDataSource.  Can be supplied as some instance deriving from EntitySource or as an array from some EntitySource.getEntities().
        ///     &#10;autoRefresh: (Optional) Instructs the LocalDataSource to implicitly reevaluate its query in response to edits to input data.  Otherwise, LocalDataSource.refresh() must be used to reevaluate the query against modified input data.
        /// </param>

        // support no new ctor
        if (this._trigger === undefined) {
            return new upshot.LocalDataSource(options);
        }

        var input = options && options.source;
        if (input && !input.__recomputeDependentViews) {  // Test if "input" is an EntitySource.
            var entitySource = obs.isArray(input) && upshot.EntitySource.as(input);
            if (!entitySource) {
                throw "Input data for a LocalDataSource must be an EntitySource or the array returned by EntitySource.getEntities().";
            }

            options.source = entitySource;

            // TODO -- If this is an array that isn't already the output of an EntitySource, 
            // engage the compatibility layer to wrap the raw array in an EntitySource.
            // Such an EntitySource would upshot.__registerRootEntitySource and would turn
            // observable CUD into Upshot "change" and "arrayChange" events.
        }

        this._autoRefresh = options && options.autoRefresh;  // TODO -- Should we make "auto refresh" a feature of RemoteDataSource too?

        // Optional query options
        this._sort = null;
        this._filter = null;

        // State
        this._refreshAllInProgress = false;

        base.constructor.call(this, options);

        if (this._autoRefresh) {
            this.refresh();
        }
    };

    var instanceMembers = {

        // override "sort" option setter
        setSort: function (sort) {
            /// <summary>
            /// Establishes the sort specification that is to be applied to the input data.
            /// </summary>
            /// <param name="sort">
            /// &#10;The sort specification to applied when loading model data.
            /// &#10;Should be supplied as an object of the form &#123; property: &#60;propertyName&#62; [, descending: &#60;bool&#62; ] &#125; or an array of ordered objects of this form.
            /// &#10;When supplied as null or undefined, the sort specification for this LocalDataSource is cleared.
            /// </param>
            /// <returns type="upshot.LocalDataSource"/>

            // TODO -- Should really raise "need refresh" event when changed (throughout).
            // TODO -- Validate sort specification?
            this._sort = sort;
            return this;
        },

        // override "filter" option setter
        setFilter: function (filter) {
            /// <summary>
            /// Establishes the filter specification that is to be applied to the input data.
            /// </summary>
            /// <param name="filter">
            /// &#10;The filter specification to applied when loading model data.
            /// &#10;Should be supplied as an object of the form &#123; property: &#60;propertyName&#62;, value: &#60;propertyValue&#62; [, operator: &#60;operator&#62; ] &#125; or a function(entity) returning Boolean or an ordered array of these forms.
            /// &#10;When supplied as null or undefined, the filter specification for this LocalDataSource is cleared.
            /// </param>
            /// <returns type="upshot.LocalDataSource"/>

            // TODO -- Should really raise "need refresh" event when changed (throughout).
            this._filter = filter && this._createFilterFunction(filter);
        },

        refresh: function (options, success, fail) {
            /// <summary>
            /// Initiates an asynchronous reevaluation of the query established with setSort, setFilter and setPaging.
            /// </summary>
            /// <param name="options" type="Object" optional="true">
            /// &#10;If supplied, an object with an "all" property, indicating that the input DataSource is to be refreshed prior to reevaluating this LocalDataSource query.
            /// </param>
            /// <param name="success" type="Function" optional="true">
            /// &#10;A success callback with signature function(entities, totalCount).
            /// </param>
            /// <param name="error" type="Function" optional="true">
            /// &#10;An error callback with signature function(httpStatus, errorText, context).
            /// </param>
            /// <returns type="upshot.LocalDataSource"/>

            if ($.isFunction(options)) {
                fail = success;
                success = options;
                options = undefined;
            }

            this._trigger("refreshStart");

            var self = this,
                sourceIsDataSource = this._entitySource.refresh;  // Only DataSources will have "refresh" (and not EntitySet and AssociatedEntitiesView).
            if (options && !!options.all && sourceIsDataSource) {
                // N.B.  "all" is a helper, in the sense that it saves a client from doing a serverDataSource.refresh and then,
                // in response to serverDataSource.onRefresh, calling localDataSource.refresh.  Also, it allows the app to listen
                // on refreshStart/refresh events from this LDS alone (and not the inner SDS as well).
                this._refreshAllInProgress = true;
                this._entitySource.refresh({ all: true }, function (entities) {
                    completeRefresh(entities);
                    self._refreshAllInProgress = false;
                }, function (httpStatus, errorText, context) {
                    self._failRefresh(httpStatus, errorText, context, fail);
                });
            } else {
                // We do this refresh asynchronously so that, if this refresh was called during a callback,
                // the app receives remaining callbacks first, before the new batch of callbacks with respect to this refresh.
                // TODO -- We should only refresh once in response to N>1 "refresh" calls.
                setTimeout(function () { completeRefresh(obs.asArray(self._entitySource.getEntities())); });
            }

            return this;

            function completeRefresh(entities) {
                self._needRecompute = false;

                var results = self._applyQuery(entities);
                self._completeRefresh(results.entities, results.totalCount, success);
            };
        },

        refreshNeeded: function () {
            /// <summary>
            /// Indicates whether the input data has been modified in such a way that LocalDataSource.getEntities() would change on the next LocalDataSource.refresh() call.
            /// </summary>
            /// <returns type="Boolean"/>

            return this._needRecompute;
        },

        // Private methods

        _setNeedRecompute: function () {
            ///#DEBUG
            upshot.assert(!this._needRecompute);  // Callers should only determine dirtiness if we're not already dirty.
            ///#ENDDEBUG

            if (this._autoRefresh) {
                // Recompute our result entities according to our regular recompute cycle,
                // just as AssociatedEntitiesView does in response to changes in its
                // target EntitySet.
                base._setNeedRecompute.call(this);
            } else {
                // Explicit use of "refresh" was requested here.  Reuse (or abuse) the _needRecompute
                // flag to track our dirtiness.
                this._needRecompute = true;
                this._trigger("refreshNeeded");
            }
        },

        _recompute: function () {
            ///#DEBUG
            upshot.assert(this._autoRefresh);  // We should only get here if we scheduled a recompute, for auto-refresh.
            ///#ENDDEBUG

            this._trigger("refreshStart");

            var results = this._applyQuery(obs.asArray(this._entitySource.getEntities()));
            // Don't __triggerRecompute here.  Downstream listeners on this data source will recompute
            // as part of this wave.
            this._applyNewQueryResult(results.entities, results.totalCount);

            this._trigger("refreshSuccess", obs.asArray(this._clientEntities), this._lastRefreshTotalEntityCount);
        },

        _normalizePropertyValue: function (entity, property) {
            // TODO -- Should do this based on metadata and return default value of the correct scalar type.
            return obs.getProperty(entity, property) || "";
        },

        _onPropertyChanged: function (entity, property, newValue) {
            base._onPropertyChanged.apply(this, arguments);

            if (this._refreshAllInProgress) {
                // We don't want to event "need refresh" due to a "refresh all".
                // Rather, we want to issue "refresh completed".
                return;
            }

            if (!this._needRecompute) {
                var needRecompute = false;
                if (this._haveEntity(entity)) {
                    if (this._filter && !this._filter(entity)) {
                        needRecompute = true;
                    }
                } else if (this._filter && this._filter(entity)) {
                    // This is overly pessimistic if we have paging options in place.
                    // It could be that this entity is already on a preceding page (and will
                    // stay there on recompute) or would be added to a following page (and
                    // excluded from the current page on recompute).
                    needRecompute = true;
                }
                if (this._haveEntity(entity) && this._sort) {
                    if ($.isFunction(this._sort)) {
                        needRecompute = true;
                    } else if (upshot.isArray(this._sort)) {
                        needRecompute = $.grep(this._sort, function (sortPart) {
                            return sortPart.property === property;
                        }).length > 0;
                    } else {
                        needRecompute = this._sort.property === property;
                    }
                }

                if (needRecompute) {
                    this._setNeedRecompute();
                }
            }
        },

        // support the following filter formats
        // function, [functions], filterPart, [filterParts]
        // return: function
        _createFilterFunction: function (filter) {
            var self = this;
            if ($.isFunction(filter)) {
                return filter;
            }

            var filters = this._normalizeFilters(filter);
            var comparisonFunctions = []
            for (var i = 0; i < filters.length; i++) {
                var filterPart = filters[i];
                if ($.isFunction(filterPart)) {
                    comparisonFunctions.push(filterPart);
                } else {
                    var func = createFunction(filterPart.property, filterPart.operator, filterPart.value);
                    comparisonFunctions.push(func);
                }
            }
            return function (entity) {
                for (var i = 0; i < comparisonFunctions.length; i++) {
                    if (!comparisonFunctions[i](entity)) {
                        return false;
                    }
                }
                return true;
            };

            function createFunction(filterProperty, filterOperator, filterValue) {
                var comparer;
                switch (filterOperator) {
                    case "<": comparer = function (propertyValue) { return propertyValue < filterValue; }; break;
                    case "<=": comparer = function (propertyValue) { return propertyValue <= filterValue; }; break;
                    case "==": comparer = function (propertyValue) { return propertyValue == filterValue; }; break;
                    case "!=": comparer = function (propertyValue) { return propertyValue != filterValue; }; break;
                    case ">=": comparer = function (propertyValue) { return propertyValue >= filterValue; }; break;
                    case ">": comparer = function (propertyValue) { return propertyValue > filterValue; }; break;
                    case "Contains":
                        comparer = function (propertyValue) {
                            if (typeof propertyValue === "string" && typeof filterValue === "string") {
                                propertyValue = propertyValue.toLowerCase();
                                filterValue = filterValue.toLowerCase();
                            }
                            return propertyValue.indexOf(filterValue) >= 0;
                        };
                        break;
                    default: throw "Unrecognized filter operator.";
                };

                return function (entity) {
                    // Can't trust added entities, for instance, to have all required property values.
                    var propertyValue = self._normalizePropertyValue(entity, filterProperty);
                    return comparer(propertyValue);
                };
            };
        },

        _getSortFunction: function () {
            var self = this;
            if (!this._sort) {
                return null;
            } else if ($.isFunction(this._sort)) {
                return this._sort;
            } else if (upshot.isArray(this._sort)) {
                var sortFunction;
                $.each(this._sort, function (unused, sortPart) {
                    var sortPartFunction = getSortPartFunction(sortPart);
                    if (!sortFunction) {
                        sortFunction = sortPartFunction;
                    } else {
                        sortFunction = function (sortPartFunction1, sortPartFunction2) {
                            return function (entity1, entity2) {
                                var result = sortPartFunction1(entity1, entity2);
                                return result === 0 ? sortPartFunction2(entity1, entity2) : result;
                            };
                        } (sortFunction, sortPartFunction);
                    }
                });
                return sortFunction;
            } else {
                return getSortPartFunction(this._sort);
            }

            function getSortPartFunction(sortPart) {
                return function (entity1, entity2) {
                    var isAscending = !sortPart.descending,
                        propertyName = sortPart.property,
                        propertyValue1 = self._normalizePropertyValue(entity1, propertyName),
                        propertyValue2 = self._normalizePropertyValue(entity2, propertyName);
                    if (propertyValue1 == propertyValue2) {
                        return 0;
                    } else if (propertyValue1 > propertyValue2) {
                        return isAscending ? 1 : -1;
                    } else {
                        return isAscending ? -1 : 1;
                    }
                };
            }
        },

        _applyQuery: function (entities) {
            var self = this;

            var filteredEntities;
            if (this._filter) {
                filteredEntities = $.grep(entities, function (entity, index) {
                    return self._filter(entity);
                });
            } else {
                filteredEntities = entities;
            }

            var sortFunction = this._getSortFunction(),
            sortedEntities;
            if (sortFunction) {
                sortedEntities = filteredEntities.sort(sortFunction);
            } else {
                sortedEntities = filteredEntities;
            }

            var skip = this._skip || 0,
                pagedEntities = sortedEntities.slice(skip);
            if (this._take) {
                pagedEntities = pagedEntities.slice(0, this._take);
            }

            return { entities: pagedEntities, totalCount: sortedEntities.length };
        },

        _onArrayChanged: function (type, eventArguments) {
            base._onArrayChanged.apply(this, arguments);

            if (this._refreshAllInProgress) {
                // We don't want to event "need refresh" due to a "refresh all".
                // Rather, we want to issue "refresh completed".
                return;
            }

            if (!this._needRecompute) {
                // See if the inner array change should cause us to raise the "need refresh" event.
                var self = this,
                    needRecompute = false;

                switch (type) {
                    case "insert":
                        var insertedEntities = eventArguments.items;
                        if (insertedEntities.length > 0) {
                            var anyExternallyInsertedEntitiesMatchFilter = $.grep(insertedEntities, function (entity) {
                                return (!self._filter || self._filter(entity)) && $.inArray(entity, obs.asArray(self._clientEntities)) < 0;
                            }).length > 0;
                            if (anyExternallyInsertedEntitiesMatchFilter) {
                                needRecompute = true;
                            }
                        }
                        break;

                    case "remove":
                        if (this._take > 0 || this._skip > 0) {
                            // If we have paging options, we have to conservatively assume that the result will be shy
                            // of the _limit due to this delete or the result should be shifted due to a delete from
                            // those entities preceding the _skip.
                            needRecompute = true;

                            // NOTE: This covers the case where an entity in our input reaches the upshot.EntityState.Deleted
                            // state.  We assume that this will cause the entity to be removed from the input EntitySource.
                        } else {
                            var nonDeletedResultEntitiesRemoved = $.grep(eventArguments.items, function (entity) {
                                return self._haveEntity(entity) &&
                                    (self.getEntityState(entity) || upshot.EntityState.Deleted) !== upshot.EntityState.Deleted;
                            });
                            if (nonDeletedResultEntitiesRemoved.length > 0) {
                                // If the input EntitySource happens to be an EntityView and entities leave that view
                                // for some other reason than reaching the upshot.EntityState.Deleted state, we should
                                // signal the need for a recompute to remove these entities from our results (but let
                                // the client control this for the non-auto-refresh case).
                                needRecompute = true;
                            }
                        }
                        break;

                    case "replaceAll":
                        if (!this._refreshAllInProgress) {
                            // We don't want to event "need refresh" due to a "refresh all".
                            // Rather, we want to issue "refresh completed".

                            var results = this._applyQuery(eventArguments.newItems);
                            if (this.totalCount !== results.totalCount) {
                                needRecompute = true;
                            } else {
                                // Reference comparison is enough here.  "property changed" catches deeper causes of "need refresh".
                                needRecompute = !upshot.sameArrayContents(obs.asArray(this._clientEntities), results.entities);
                            }
                        }
                        break;

                    default:
                        throw "Unknown array operation '" + type + "'.";
                }

                if (needRecompute) {
                    this._setNeedRecompute();
                }
            }
        },

        _handleEntityAdd: function (entity) {
            if (!this._needRecompute) {
                if (this._filter && !this._filter(entity)) {
                    this._setNeedRecompute();
                }
            }
            base._handleEntityAdd.apply(this, arguments);
        },

        _handleEntityDelete: function (entity) {
            if (!this._needRecompute && this._take > 0) {
                // If we have a _take, we have to conservatively assume that the result will be one entity shy of
                // the take due to this delete.
                this._setNeedRecompute();
            }
            base._handleEntityDelete.apply(this, arguments);
        }
    };

    upshot.LocalDataSource = upshot.deriveClass(base, ctor, instanceMembers);

}
)(this, jQuery, upshot);

///
/// DataProvider.OData.js
///

(function (global, $, upshot, undefined)
{
    function pad(count, value) {
        var str = "0000" + value;
        return str.slice(str.length - count);
    }

    function formatDateTime(date) {
        return "datetime" +
            "'" + pad(4, date.getUTCFullYear()) +
            "-" + pad(2, date.getUTCMonth() + 1) +
            "-" + pad(2, date.getUTCDate()) +
            "T" + pad(2, date.getUTCHours()) +
            ":" + pad(2, date.getUTCMinutes()) +
            ":" + pad(2, date.getUTCSeconds()) + "'";
    }

    function getQueryResult(getResult) {
        var entities = getResult.results,
            resultType = entities.length && entities[0].__metadata.type;

        var metadata;
        if (resultType) {
            metadata = {};
            metadata[resultType] = {
                key: ["__metadata.uri"]
            };
        }

        var count = getResult.__count,
            totalCount = count === undefined ? null : +count;

        return {
            type: resultType,
            metadata: metadata,
            entities: entities,
            totalCount: totalCount
        };
    }

    var instanceMembers = {

        // Public methods

        get: function (parameters, queryParameters, success, error) {
            /// <summary>
            /// Asynchronously gets data from the server using the specified parameters
            /// </summary>
            /// <param name="parameters" type="String">The get parameters</param>
            /// <param name="queryParameters" type="Object">An object where each property is a query to pass to the operation. This parameter is optional.</param>
            /// <param name="success" type="Function">Optional success callback</param>
            /// <param name="error" type="Function">Optional error callback</param>
            /// <returns type="Promise">A Promise representing the result of the load operation</returns>

            var operation, operationParameters;
            if (parameters) {
                operation = parameters.operationName;
                operationParameters = parameters.operationParameters;
            }

            if ($.isFunction(operationParameters)) {
                success = operationParameters;
                error = queryParameters;
            }

            var self = this;

            // $.map applied to objects is supported in jQuery >= 1.6. Our current baseline is jQuery 1.5
            var parameterStrings = [];
            $.each($.extend({}, operationParameters, upshot.ODataDataProvider.getODataQueryParameters(queryParameters)), function (key, value) {
                parameterStrings.push(key.toString() + "=" + value.toString());
            });
            var queryString = parameterStrings.length ? ("?" + parameterStrings.join("&")) : "";

            // Invoke the query
            OData.read(upshot.DataProvider.normalizeUrl(parameters.url) + operation + queryString,
                function (result) {
                    if (success) {
                        arguments[0] = getQueryResult(arguments[0]);
                        success.apply(self, arguments);
                    }
                },
                function (reason) {
                    if (error) {
                        error.call(self, -1, reason.message, reason);
                    }
                }
            );
        },

        submit: function () {
            throw "Saving edits through the OData data provider is not supported.";
        }
    };

    var classMembers = {
        getODataQueryParameters: function (query) {
            query = query || {};
            var queryParameters = {};

            // filters -> $filter
            if (query.filters && query.filters.length) {
                var filterParameter = "",
                applyOperator = function (property, operator, value) {
                    if (typeof value === "string") {
                        if (upshot.isGuid(value)) {
                            value = "guid'" + value + "'";
                        } else {
                            value = "'" + value + "'";
                        }
                    } else if (upshot.isDate(value)) {
                        value = formatDateTime(value);
                    }

                    switch (operator) {
                        case "<": return property + " lt " + value;
                        case "<=": return property + " le " + value;
                        case "==": return property + " eq " + value;
                        case "!=": return property + " ne " + value;
                        case ">=": return property + " ge " + value;
                        case ">": return property + " gt " + value;
                        case "StartsWith": return "startswith(" + property + "," + value + ") eq true";
                        case "EndsWith": return "endswith(" + property + "," + value + ") eq true";
                        case "Contains": return "substringof(" + value + "," + property + ") eq true";
                        default: throw "The operator '" + operator + "' is not supported.";
                    }
                };

                $.each(query.filters, function (index, filter) {
                    if (filterParameter) {
                        filterParameter += " and ";
                    }
                    filterParameter += applyOperator(filter.property, filter.operator, filter.value);
                });

                queryParameters.$filter = filterParameter;
            }

            // sort -> $orderby
            if (query.sort && query.sort.length) {
                var formatSort = function (sort) {
                    return !!sort.descending ? (sort.property + " desc") : sort.property;
                };
                queryParameters.$orderby = $.map(query.sort, function (sort, index) {
                    return formatSort(sort);
                }).join();
            }

            // skip -> $skip
            if (query.skip) {
                queryParameters.$skip = query.skip;
            }

            // take -> $top
            if (query.take) {
                queryParameters.$top = query.take;
            }

            // includeTotalCount -> $inlinecount
            if (query.includeTotalCount) {
                queryParameters.$inlinecount = "allpages";
            }

            return queryParameters;
        }
    }

    upshot.ODataDataProvider = upshot.defineClass(null, instanceMembers, classMembers);

}
)(this, jQuery, upshot);

///
/// DataProvider.ria.js
///

(function (global, $, upshot, undefined)
{
    function transformQuery(query) {
        var queryParameters = {};

        // filters -> $where
        if (query.filters && query.filters.length) {
            var whereParameter = "",
                applyOperator = function (property, operator, value) {
                    if (typeof value === "string") {
                        if (upshot.isGuid(value)) {
                            value = "Guid(" + value + ")";
                        } else {
                            value = '"' + value + '"';
                        }
                    } else if (upshot.isDate(value)) {
                        // DomainService expects ticks; js Date.getTime() gives ms since epoch
                        value = "DateTime(" + (value.getTime() * 10000 + 621355968000000000) + ")";
                    }

                    switch (operator) {
                        case "<":
                        case "<=":
                        case "==":
                        case "!=":
                        case ">=":
                        case ">": return property + operator + value;
                        case "StartsWith":
                        case "EndsWith":
                        case "Contains": return property + "." + operator + "(" + value + ")";
                        default: throw "The operator '" + operator + "' is not supported.";
                    }
                };

            $.each(query.filters, function (index, filter) {
                if (whereParameter) {
                    whereParameter += " AND ";
                }
                whereParameter += applyOperator(filter.property, filter.operator, filter.value);
            });

            queryParameters.$where = whereParameter;
        }

        // sort -> $orderby
        if (query.sort && query.sort.length) {
            var formatSort = function (sort) {
                return !!sort.descending ? (sort.property + " desc") : sort.property;
            };
            queryParameters.$orderby = $.map(query.sort, function (sort, index) {
                return formatSort(sort);
            }).join();
        }

        // skip -> $skip
        if (query.skip) {
            queryParameters.$skip = query.skip;
        }

        // take -> $take
        if (query.take) {
            queryParameters.$take = query.take;
        }

        // includeTotalCount -> $includeTotalCount
        if (query.includeTotalCount) {
            queryParameters.$includeTotalCount = query.includeTotalCount;
        }

        return queryParameters;
    }

    function transformParameters(parameters) {
        // perform any required transformations on the specified parameters
        // before invoking the service, for example json serializing arrays
        // and other complex parameters.
        if (parameters) {
            $.each(parameters || {}, function (key, value) {
                if ($.isArray(value)) {
                    // json serialize arrays since this is the format the json
                    // endpoint expects.
                    parameters[key] = JSON.stringify(value);
                }
            });
        }

        return parameters;
    }

    function getQueryResult(getResult) {
        var resultKey;
        $.each(getResult, function (key) {
            if (/Result$/.test(key)) {
                resultKey = key;
                return false;
            }
        });
        var result = getResult[resultKey];
        
        // process the metadata
        var metadata = {};
        $.each(result.Metadata, function (unused, metadataForType) {
            metadata[metadataForType.type] = {
                key: metadataForType.key,
                fields: metadataForType.fields,
                rules: metadataForType.rules,
                messages: metadataForType.messages
            };
        });

        var includedEntities;
        if (result.IncludedResults) {
            // group included entities by type
            includedEntities = {};
            $.each(result.IncludedResults, function (unused, entity) {
                var entityType = entity.__type;
                var entities = includedEntities[entityType] || (includedEntities[entityType] = []);
                entities.push(entity);
            });
        }

        return {
            type: result.Metadata[0].type,
            metadata: metadata,
            entities: result.RootResults,
            includedEntities: includedEntities,
            totalCount: result.TotalCount || 0
        };
    }

    var instanceMembers = {

        // Public methods

        get: function (parameters, queryParameters, success, error) {
            /// <summary>
            /// Asynchronously gets data from the server using the specified parameters
            /// </summary>
            /// <param name="parameters" type="String">The get parameters</param>
            /// <param name="queryParameters" type="Object">An object where each property is a query to pass to the operation. This parameter is optional.</param>
            /// <param name="success" type="Function">Optional success callback</param>
            /// <param name="error" type="Function">Optional error callback</param>
            /// <returns type="Promise">A Promise representing the result of the load operation</returns>

            var operation, operationParameters;
            if (parameters) {
                operation = parameters.operationName;
                operationParameters = parameters.operationParameters;
            }

            if ($.isFunction(operationParameters)) {
                success = operationParameters;
                error = queryParameters;
            }

            var self = this;

            // Invoke the query
            $.ajax({
                url: upshot.DataProvider.normalizeUrl(parameters.url) + "json/" + operation,
                data: $.extend({}, transformParameters(operationParameters), transformQuery(queryParameters || {})),
                success: success && function () {
                    arguments[0] = getQueryResult(arguments[0]);
                    success.apply(self, arguments);
                },
                error: error && function (jqXHR, statusText, errorText) {
                    error.call(self, jqXHR.status, self._parseErrorText(jqXHR.responseText) || errorText, jqXHR);
                },
                dataType: "json"
            });
        },

        submit: function (parameters, changeSet, success, error) {
            /// <summary>
            /// Asynchronously submits the specified changeset
            /// </summary>
            /// <param name="parameters" type="String">The submit parameters</param>
            /// <param name="changeSet" type="Object">The changeset to submit</param>
            /// <param name="success" type="Function">Optional success callback</param>
            /// <param name="error" type="Function">Optional error callback</param>
            /// <returns type="Promise">A Promise representing the result of the post operation</returns>

            var self = this,
                encodedChangeSet = JSON.stringify({ changeSet: changeSet });

            $.ajax({
                url: upshot.DataProvider.normalizeUrl(parameters.url) + "json/SubmitChanges",
                contentType: "application/json",
                data: encodedChangeSet,
                dataType: "json",
                type: "POST",
                success: (success || error) && function (data, statusText, jqXHR) {
                    var result = data["SubmitChangesResult"];
                    var hasErrors = false;
                    if (result) {
                        // transform to Error property
                        $.each(result, function (index, changeSetEntry) {
                            // even though upshot currently doesn't support reporting of concurrency conflicts,
                            // we must still identify such failures
                            $.each(["ConflictMembers", "ValidationErrors", "IsDeleteConflict"], function (index, property) {
                                if (changeSetEntry.hasOwnProperty(property)) {
                                    changeSetEntry.Error = changeSetEntry.Error || {};
                                    changeSetEntry.Error[property] = changeSetEntry[property];
                                    hasErrors = true;
                                }
                            });
                        });
                    }

                    if (!hasErrors) {
                        if (success) {
                            success.call(self, result);
                        }
                    } else if (error) {
                        var errorText = "Submit failed.";
                        if (result) {
                            for (var i = 0; i < result.length; ++i) {
                                var validationError = (result[i].ValidationErrors && result[i].ValidationErrors[0] && result[i].ValidationErrors[0].Message);
                                if (validationError) {
                                    errorText = validationError;
                                    break;
                                }
                            }
                        }
                        error.call(self, jqXHR.status, errorText, jqXHR, result);
                    }
                },
                error: error && function (jqXHR, statusText, errorText) {
                    error.call(self, jqXHR.status, self._parseErrorText(jqXHR.responseText) || errorText, jqXHR);
                }
            });
        },

        _parseErrorText: function (responseText) {
            var match = /Exception]: (.+)\r/g.exec(responseText);
            if (match && match[1]) {
                return match[1];
            }
            if (/^{.*}$/g.test(responseText)) {
                var error = JSON.parse(responseText);
                if (error.ErrorMessage) {
                    return error.ErrorMessage;
                }
            }
        }
    }

    upshot.riaDataProvider = upshot.defineClass(null, instanceMembers);
}
)(this, jQuery, upshot);
