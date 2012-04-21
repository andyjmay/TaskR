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


(function (ko, upshot, undefined) {
    upshot.RemoteDataSource.prototype.getFirstEntity = function () {
        var allEntities = this.getEntities();
        return ko.computed(function () { return allEntities()[0] });
    };

    upshot.RemoteDataSource.prototype.getEntitiesWithStatus = function (options) {
        var result = this.getEntities();
        if (!result.loaded) {
            result.loaded = ko.observable(false);
            result.error = ko.observable(null);

            var capacity = options && options.capacity;
            if (capacity) {
                this.setPaging({ take: capacity, includeTotalCount: true });
            }

            this.bind({
                refreshStart: function () { result.error(null); result.loaded(false); },
                refreshError: function (httpStatus, message) { result.error(message); },
                refreshSuccess: function (data, count) {
                    // Raise a suitable notification if there are too many results 
                    // to fit in the requested capacity
                    if (capacity && count > capacity) {
                        result.error("Too many items");
                    } else {
                        result.error(null);
                        result.loaded(true);
                    }
                }
            });
        }
        return result;
    };

    upshot.PagingModel = function (dataSource, opts) {
        // Underlying private data
        opts = opts || {};
        var self = this;
        var _dataSource = dataSource;
        var _pageIndex = ko.observable();
        var _pageSize = ko.observable();
        var _totalItems = ko.observable();

        // Read-only properties computed from the above        
        self.totalItems = ko.computed(_totalItems);
        self.totalPages = ko.computed(function () { return Math.ceil(_totalItems() / _pageSize()) });
        self.canMoveNext = ko.computed(function () { return Number(_pageIndex()) < self.totalPages() });
        self.canMovePrev = ko.computed(function () { return Number(_pageIndex()) > 1 });

        // Operations
        self.moveNext = function () { self.pageIndex(self.pageIndex() + 1) }
        self.movePrev = function () { self.pageIndex(self.pageIndex() - 1) }
        self.moveFirst = function () { self.pageIndex(1) }
        self.moveLast = function () { self.pageIndex(self.totalPages()) }
        self.moveTo = function (pageIndex, pageSize) {
            _pageIndex(Number(pageIndex));
            _pageSize(Number(pageSize));
            _dataSource.setPaging({ skip: (_pageIndex() - 1) * _pageSize(), take: _pageSize(), includeTotalCount: true });
        }

        // If you don't specify an onPageChange callback, the default is just to update & refresh the underlying dataSource
        // This won't update your URL, so if you're doing client-side navigation, you'll want to override this
        var onPageChangeHandler = opts.onPageChange || function (pageIndex, pageSize) {
            self.moveTo(pageIndex, pageSize);
            _dataSource.refresh();
        };

        // Read-write properties that trigger an "onPageChange" callback when you write new values to them
        self.pageIndex = ko.computed({
            read: _pageIndex,
            write: function (val) {
                val = Number(val);
                if (val !== _pageIndex())
                    onPageChangeHandler(val, self.pageSize());
            }
        });
        self.pageSize = ko.computed({
            read: _pageSize,
            write: function (val) {
                val = Number(val);
                if (val !== _pageSize())
                    onPageChangeHandler(1, val);
            }
        });

        // Capture the total items count whenever it changes
        _dataSource.bind({
            refreshSuccess: function (data, count) { _totalItems(count) }
        });
    };

    ko.bindingHandlers.autovalidate = {
        update: function (element, valueAccessor, allBindingsAccessor) {
            if (ko.utils.unwrapObservable(valueAccessor()) !== false) {
                // Establish a dependency on any value/checked/selectedOptions observable value
                var allBindings = allBindingsAccessor();
                var respondAfterBinding = allBindings.value || allBindings.checked || allBindings.selectedOptions;
                ko.utils.unwrapObservable(respondAfterBinding);

                // Cause jQuery Validation to revalidate this form element
                $(element).trigger("focusout");
            }
        }
    };

    ko.bindingHandlers.validate = {
        init: function (element, valueAccessor) {
            // Apply the validation configuration to the form
            var config = valueAccessor();
            $(element).validate().settings = $.extend(true, {}, $.validator.defaults, config);
            // Todo: replace above line with "$(element).validate(config);" after Beta
        },
        update: function (element, valueAccessor) {
            // Respond to any 'resetFormOnChange' value by removing any error messages
            ko.utils.unwrapObservable(valueAccessor().resetFormOnChange);
            $(element).validate().resetForm();
        }
    };

    ko.bindingHandlers.flash = {
        update: function (element, valueAccessor) {
            var options = valueAccessor(), text = ko.utils.unwrapObservable(options.text);

            // Unfortunately, .stop() doesn't clear .delay()s in jQuery 1.6, so we'll have to 
            // manage the animation queue manually (http://bugs.jquery.com/ticket/6150)
            clearTimeout($(element).data("flashQueue"));
            if (text) {
                $(element).slideDown(250).text(text);
                $(element).data("flashQueue", setTimeout(function () { $(element).slideUp(250) }, options.duration || 5000));
            } else
                $(element).hide();
        }
    };
}
)(ko, upshot);