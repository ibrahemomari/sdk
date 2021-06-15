/**
 * Binds a TinyMCE widget to <textarea> elements.
 */
angular.module('ui.tinymce', [])
    .value('uiTinymceConfig', {})
    .directive('uiTinymce', ['$rootScope', '$compile', '$timeout', '$window', '$sce', 'uiTinymceConfig', function ($rootScope, $compile, $timeout, $window, $sce, uiTinymceConfig) {
        uiTinymceConfig = uiTinymceConfig || {};
        var generatedIds = 0;
        var ID_ATTR = 'ui-tinymce';
        if (uiTinymceConfig.baseUrl) {
            tinymce.baseURL = uiTinymceConfig.baseUrl;
        }

        return {
            require: ['ngModel', '^?form'],
            link: function (scope, element, attrs, ctrls) {
                if (!$window.tinymce) {
                    return;
                }

                var ngModel = ctrls[0],
                    form = ctrls[1] || null;

                var expression, options, tinyInstance,
                    updateView = function (editor) {
                        var content = editor.getContent({ format: options.format }).trim();
                        content = $sce.trustAsHtml(content);

                        ngModel.$setViewValue(content);
                        if (!$rootScope.$$phase) {
                            scope.$apply();
                        }
                    };

                function toggleDisable(disabled) {
                    if (disabled) {
                        ensureInstance();

                        if (tinyInstance) {
                            tinyInstance.getBody().setAttribute('contenteditable', false);
                        }
                    } else {
                        ensureInstance();

                        if (tinyInstance) {
                            tinyInstance.getBody().setAttribute('contenteditable', true);
                        }
                    }
                }

                // generate an ID
                attrs.$set('id', ID_ATTR + '-' + generatedIds++);

                expression = {};

                angular.extend(expression, scope.$eval(attrs.uiTinymce));

                options = {
                    selector: 'textarea',  // change this value according to your HTML
                    toolbar: ['  styleselect  | insertfile | forecolor | backcolor  | bold italic | alignleft aligncenter alignright alignjustify  | bullist  numlist | outdent indent | link image | media  | code'
                    ],
                    valid_elements: "*[*]",
                    content_css: '../../../../../scripts/buildfire/components/ratingSystem/index.css',
                    menu: {
                        edit: { title: 'Edit', items: 'undo redo | cut copy paste pastetext | selectall' },
                        insert: { title: 'Insert', items: 'link image | media  | code' },
                        view   : { title : 'View'  , items : 'preview' },
                        format : { title : 'Format', items : 'bold italic underline strikethrough superscript subscript | removeformat' },
                    },

                    // Update model when calling setContent
                    // (such as from the source editor popup)
                    setup: function (ed) {
                        ed.on('init', function () {
                            var scriptId = ed.dom.uniqueId();
                            var scriptElm = ed.dom.create( 'script', {
                                id: scriptId,
                                type: 'text/javascript',
                                src: '../../../../../scripts/buildfire.js'
                            } );
                            ed.getDoc().getElementsByTagName( 'head' )[ 0 ].appendChild( scriptElm );
                            ngModel.$render();
                            ngModel.$setPristine();
                            if (form) {
                                form.$setPristine();
                            }
                        });

                        // Update model on button click
                        ed.on('ExecCommand', function () {
                            ed.save();
                            updateView(ed);
                        });

                        // Update model on change
                        ed.on('change NodeChange', function (e) {
                            ed.save();
                            updateView(ed);
                        });

                        ed.on('blur', function () {
                            element[0].blur();
                        });

                        // Update model when an object has been resized (table, image)
                        ed.on('ObjectResized', function () {
                            ed.save();
                            updateView(ed);
                        });

                        ed.on('remove', function () {
                            element.remove();
                        });

                        if (expression.setup) {
                            expression.setup(ed, {
                                updateView: updateView
                            });
                        }
                    },
                    format: 'html',
                    selector: '#' + attrs.id
                };
                // extend options with initial uiTinymceConfig and
                // options from directive attribute value
                angular.extend(options, uiTinymceConfig, expression);
                // Wrapped in $timeout due to $tinymce:refresh implementation, requires
                // element to be present in DOM before instantiating editor when
                // re-rendering directive
                $timeout(function () {
                    options.plugins = "preview , image,code,media,link ,textcolor colorpicker";
                    tinymce.init(options);
                    toggleDisable(scope.$eval(attrs.ngDisabled));
                });

                ngModel.$formatters.unshift(function (modelValue) {
                    return modelValue ? $sce.trustAsHtml(modelValue) : '';
                });

                ngModel.$parsers.unshift(function (viewValue) {
                    return viewValue ? $sce.getTrustedHtml(viewValue) : '';
                });

                ngModel.$render = function () {
                    ensureInstance();

                    var viewValue = ngModel.$viewValue ?
                        $sce.getTrustedHtml(ngModel.$viewValue) : '';

                    // instance.getDoc() check is a guard against null value
                    // when destruction & recreation of instances happen
                    if (tinyInstance &&
                        tinyInstance.getDoc()
                    ) {
                        tinyInstance.setContent(viewValue);
                        // Triggering change event due to TinyMCE not firing event &
                        // becoming out of sync for change callbacks
                        tinyInstance.fire('change');
                    }
                };

                attrs.$observe('disabled', toggleDisable);

                // This block is because of TinyMCE not playing well with removal and
                // recreation of instances, requiring instances to have different
                // selectors in order to render new instances properly
                scope.$on('$tinymce:refresh', function (e, id) {
                    var eid = attrs.id;
                    if (angular.isUndefined(id) || id === eid) {
                        var parentElement = element.parent();
                        var clonedElement = element.clone();
                        clonedElement.removeAttr('id');
                        clonedElement.removeAttr('style');
                        clonedElement.removeAttr('aria-hidden');
                        tinymce.execCommand('mceRemoveEditor', false, eid);
                        parentElement.append($compile(clonedElement)(scope));
                    }
                });

                scope.$on('$destroy', function () {
                    ensureInstance();

                    if (tinyInstance) {
                        tinyInstance.remove();
                        tinyInstance = null;
                    }
                });

                function ensureInstance() {
                    if (!tinyInstance) {
                        tinyInstance = tinymce.get(attrs.id);
                    }
                }
            }
        };
    }]);