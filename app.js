(function($) {
    var app = $.sammy(function() {
        
        this.use(Sammy.Template);
        
        this.notFound = function(verb, path) {
            this.runRoute('get', '#/404');
        };
        
        this.get('#/about', function() {
            this.partial('templates/about.template', {}, function(html) {
                $('#page').html(html);
            });
        });
        
        this.get('#/404', function() {
            this.partial('templates/404.template', {}, function(html) {
                $('#page').html(html);
            });
        });
        
        this.get('#/list/:id', function() {
            var list = Lists.get(this.params['id']);
            if (list) {
                this.partial('templates/todolist.template', {
                    list: list,
                    todos: Todos.filter('listId', list.id)
                }, function(html) {
                    $('#page').html(html);
                });
            } else {
                this.notFound();
            }
        });
        
        this.get('#/about', function() {
            this.log('about');
        });
        
        
        // events
        this.bind('run', function(e, data) {
            var context = this;
            
            var title = localStorage.getItem('title') || "Sammy's Todos";
            $('h1').text(title);
            
            $('.new')
                .live('click', function() {
                    var $this = $(this),
                        type  = $this.attr('data-type');
                    
                    switch (type) {
                        case "list":
                            var list = Lists.create({ name: 'My new list' });
                            Todos.create({ name: 'Something todo', done: false, listId: list.id });
                            context.redirect('#/list/'+list.id);
                            app.trigger('updateLists');
                            break;
                        case "todo":
                            var todo = Todos.create({ name: 'My new todo', done: false, listId: parseInt($('h2').attr('data-id'), 10) });
                            context.partial('templates/_todo.template', todo, function(html) {
                                $(html).insertBefore('#page li:last');
                            });
                            break;
                    }
                });
            
            $('#lists')
                .delegate('dd[data-id]', 'click', function() {
                    context.redirect('#/list/'+$(this).attr('data-id'));
                    app.trigger('updateList');
                });
            
            $('.trashcan')
                .live('click', function() {
                    var $this  = $(this);
                    app.trigger('delete', {
                        type: $this.attr('data-type'),
                        id:   $this.attr('data-id')
                    });
                });
        
            $('.checkbox')
                .live('click', function() {
                    var $this  = $(this),
                        $li    = $this.parents('li').toggleClass('done'),
                        isDone = $li.is('.done');
                    app.trigger('mark' + (isDone ? 'Done' : 'Undone'), { id: $li.attr('data-id') });
                });
        
            $('[contenteditable]')
                .live('focus', function() {
                    // store the current value
                    $.data(this, 'prevValue', $(this).text());
                })
                .live('blur', function() {
                    var $this = $(this),
                        // grab the, likely, modified value
                        text = $.trim($this.text());
                    if (!text) {
                        // restore the previous value if text is empty
                        $this.text($.data(this, 'prevValue'));
                    } else {
                        if ($this.is('h1')) {
                            // it is the title
                            localStorage.setItem('title', text);
                        } else {
                            // save it
                            app.trigger('save', {
                                type: $this.attr('data-type'),
                                id: $this.attr('data-id'),
                                name: text
                            });
                        }
                    }
                })
                .live('keypress', function(event) {
                    // save on enter
                    if (event.which === 13) {
                        this.blur();
                        return false;
                    }
                });
        
            if (!localStorage.getItem('initialized')) {
                // create first list and todo
                var listId = Lists.create({
                    name: 'My first list'
                }).id;
                Todos.create({
                    name: 'My first todo',
                    done: false,
                    listId: listId
                });
            
                localStorage.setItem('initialized', 'yup');
                this.redirect('#/list/'+listId);
            } else {
                var lastViewedOrFirstList = localStorage.getItem('lastviewed') || '#/list/' + Lists.first().id;
                this.redirect(lastViewedOrFirstList);
            }
            
            app.trigger('updateLists');
        });
        
        this.bind('route-found', function(e, data) {
            // save the route as the lastviewed
            localStorage.setItem('lastviewed', document.location.hash);
        });
        
        this.bind('save', function(e, data) {
            var model = data.type == 'todo' ? Todos : Lists;
            model.update(data.id, { name: data.name });
            if (data.type == 'list') {
                app.trigger('updateLists');
            }
        });
        
        this.bind('markDone', function(e, data) {
            this.log('marking todo with id ' + data.id + ' as done');
            Todos.update(data.id, { done: true });
        });
        
        this.bind('markUndone', function(e, data) {
            this.log('marking todo with id ' + data.id + ' as not done');
            Todos.update(data.id, { done: false });
        });
        
        this.bind('delete', function(e, data) {
            if (confirm('Are you sure you want to delete this ' + data.type + '?')) {
                var model = data.type == 'list' ? Lists : Todos;
                model.destroy(data.id);
                
                if (data.type == 'list') {
                    var list = Lists.first();
                    if (list) {
                        this.redirect('#/list/'+list.id);
                    } else {
                        // create first list and todo
                        var listId = Lists.create({
                            name: 'My first list'
                        }).id;
                        Todos.create({
                            name: 'My first todo',
                            done: false,
                            listId: listId
                        });
                        
                        this.redirect('#/list/'+listId);
                    }
                    app.trigger('updateLists');
                } else {
                    // delete the todo from the view
                    $('li[data-id=' + data.id + ']').remove();
                }
            }
        });
        
        this.bind('updateLists', function(e, data) {
            var selected = parseInt(location.hash.substr(location.hash.lastIndexOf('/')+1), 10);
            this.partial('templates/_lists.template', {
                lists: Lists.getAll(),
                selected: selected
            }, function(html) {
                $('#lists').html(html);
            });
        });
        
    });

    // lists model
    Lists = Object.create(Model);
    Lists.name = 'lists';
    Lists.init();
        
    // todos model
    Todos = Object.create(Model);
    Todos.name = 'todos';
    Todos.init();


    $(function() { app.run(); });
})(jQuery);