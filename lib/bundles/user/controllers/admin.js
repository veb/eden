
// Bind dependencies
const grid        = require('grid');
const alert       = require('alert');
const crypto      = require('crypto');
const controller  = require('controller');
const escapeRegex = require('escape-string-regexp');

// Require models
const acl  = model('acl');
const user = model('user');

// Bind local dependencies
const config = require('config');

/**
 * Build user admin controller
 *
 * @acl   admin.users.view
 * @fail  /
 * @mount /admin/user
 */
class admin extends controller {

  /**
   * Construct user admin controller
   */
  constructor () {
    // Run super
    super();

    // Bind methods
    this.gridAction         = this.gridAction.bind(this);
    this.indexAction        = this.indexAction.bind(this);
    this.createAction       = this.createAction.bind(this);
    this.updateAction       = this.updateAction.bind(this);
    this.removeAction       = this.removeAction.bind(this);
    this.createSubmitAction = this.createSubmitAction.bind(this);
    this.updateSubmitAction = this.updateSubmitAction.bind(this);
    this.removeSubmitAction = this.removeSubmitAction.bind(this);

    // Bind private methods
    this._grid = this._grid.bind(this);
  }

  /**
   * Index action
   *
   * @param req
   * @param res
   *
   * @icon    fa fa-user
   * @menu    {ADMIN} Users
   * @title   User Administration
   * @route   {get} /
   * @layout  admin
   */
  async indexAction (req, res) {
    // Render user admin page
    let Grid = await this._grid().render(req);

    // Render grid
    res.render('user/admin', {
      'grid' : Grid
    });
  }

  /**
   * Add/edit action
   *
   * @param req
   * @param res
   *
   * @route    {get} /create
   * @route    {get} /:id/edit
   * @menu     {USERS} Add User
   * @layout   admin
   * @priority 12
   */
  createAction (req, res) {
    // Return update action
    return this.updateAction(req, res);
  }

  /**
   * Update action
   *
   * @param req
   * @param res
   *
   * @route   {get} /:id/update
   * @layout  admin
   */
  async updateAction (req, res) {
    // Set website variable
    let User   = new user();
    let create = true;

    // Check for website model
    if (req.params.id) {
      // Load user
      User   = await user.findById(req.params.id);
      create = false;
    }

    // Check for website
    if (!User) {
      User = new user();
    }

    // Get acls
    let uacls = (await User.get('acl') || []).map((Acl) => {
      // Return id
      return Acl.get('_id').toString();
    });

    // Set acls
    let acls = (await acl.find() || []).map((Acl) => {
      // Return sanitised
      return {
        'id'   : Acl.get('_id').toString(),
        'has'  : uacls.includes(Acl.get('_id').toString()),
        'name' : Acl.get('name')
      };
    });

    // Render page
    res.render('user/admin/update', {
      'usr'   : await User.sanitise(),
      'acls'  : acls,
      'title' : create ? 'Create New' : 'Update ' + (User.get('username') || User.get('email'))
    });
  }

  /**
   * Login as user
   *
   * @param  {Request}  req
   * @param  {Response} res
   *
   * @route   {get} /:id/login
   * @return {Promise}
   */
  async loginAsAction (req, res) {
    // Set website variable
    let User = await user.findById(req.params.id);

    // Login as user
    req.login(User, () => {
      // Redirect
      res.redirect('/');
    });
  }

  /**
   * Create submit action
   *
   * @param req
   * @param res
   *
   * @route   {post} /create
   * @layout  admin
   */
  createSubmitAction (req, res) {
    // Return update action
    return this.updateSubmitAction(req, res);
  }

  /**
   * Add/edit action
   *
   * @param req
   * @param res
   *
   * @route   {post} /:id/update
   * @layout  admin
   */
  async updateSubmitAction (req, res) {
    // Set website variable
    let User   = new user();
    let create = true;

    // Check for website model
    if (req.params.id) {
      // Load by id
      User   = await user.findById(req.params.id);
      create = false;
    }

    // Get user acls
    let UAcls = await User.get('acl');

    // Loop acls
    if (req.body.roles && req.body.roles.length) {
      // Check if Array
      if (!Array.isArray(req.body.roles)) req.body.roles = [req.body.roles];

      // Loop roles
      UAcls = await Promise.all(req.body.roles.map((role) => {
        // Return found role
        return acl.findById(role);
      }));
    }

    // Set User model variables
    User.set('acl',      UAcls);
    User.set('email',    req.body.email);
    User.set('username', req.body.username);

    // Check for user password
    if (req.body.password && req.body.password.length) {
      // Everything checks out
      let hash = crypto.createHmac('sha256', config.get('secret'))
        .update(req.body.password)
        .digest('hex');

      // Set hash
      User.set('hash', hash);
    }

    // Save user
    await User.save();

    // Get acls
    let uacls = (await User.get('acl')).map((Acl) => {
      // Return id
      return Acl.get('_id').toString();
    });

    // Set acls
    let acls = (await acl.find()).map((Acl) => {
      // Return sanitised
      return {
        'id'   : Acl.get('_id').toString(),
        'has'  : uacls.includes(Acl.get('_id').toString()),
        'name' : Acl.get('name')
      };
    });

    // Update user
    req.alert('success', 'Successfully updated user');

    // Render page
    res.render('user/admin/update', {
      'usr'   : await User.sanitise(),
      'acls'  : acls,
      'title' : create ? 'Create New' : 'Update ' + (User.get('username') || User.get('email'))
    });
  }

  /**
   * Delete action
   *
   * @param req
   * @param res
   *
   * @route   {get} /:id/remove
   * @layout  admin
   */
  async removeAction (req, res) {
    // Set website variable
    let User = false;

    // Check for website model
    if (req.params.id) {
      // Load user
      User = await user.findById(req.params.id);
    }

    // Render page
    res.render('user/admin/remove', {
      'usr'   : await User.sanitise(),
      'title' : 'Remove ' + (User.get('username') || User.get('email'))
    });
  }

  /**
   * Delete action
   *
   * @param req
   * @param res
   *
   * @route   {post} /:id/remove
   * @title   User Administration
   * @layout  admin
   */
  async removeSubmitAction (req, res) {
    // Set website variable
    let User = false;

    // Check for website model
    if (req.params.id) {
      // Load user
      User = await user.findById(req.params.id);
    }

    // Delete website
    await User.remove();

    // Alert Removed
    req.alert('success', 'Successfully removed ' + (User.get('username') || User.get('email')));

    // Render index
    return this.indexAction(req, res);
  }

  /**
   * User alert emit
   *
   * @socket user.alert
   */
  async alertSocket (data, opts) {
    // Alert user
    alert.user(await user.findById(data.id), data.type, data.text);

    // Alert socket
    opts.alert('success', 'successfully sent alert');
  }

  /**
   * User grid action
   *
   * @param req
   * @param res
   *
   * @route {post} /grid
   */
  gridAction (req, res) {
    // Return post grid request
    return this._grid().post(req, res);
  }

  /**
   * Renders grid
   *
   * @return {grid}
   */
  _grid () {
    // Create new grid
    let userGrid = new grid();

    // Set route
    userGrid.route('/admin/user/grid');

    // Set grid model
    userGrid.model(user);

    // Add grid columns
    userGrid.column('_id', {
      'title'  : 'ID',
      'width'  : '1%',
      'format' : async (col) => {
        return col ? '<a href="/admin/user/' + col.toString() + '/update">' + col.toString() + '</a>' : '<i>N/A</i>';
      }
    }).column('username', {
      'sort'   : true,
      'title'  : 'Username',
      'format' : async (col) => {
        return col ? col.toString() : '<i>N/A</i>';
      }
    }).column('acl', {
      'title'  : 'Roles',
      'format' : async (col, row) => {
        // Set acls
        let Acls = await row.get('acl');
        let acls = [];

        // Check acls
        if (!Acls) return '<i>N/A</i>';

        // Loop acls
        for (let i = 0; i < Acls.length; i++) {
          // Add name to acls
          if (Acls[i].get) acls.push(Acls[i].get('name'));
        }

        // Resolve acls
        return acls.join(', ');
      }
    }).column('email', {
      'sort'   : true,
      'title'  : 'Email',
      'format' : async (col) => {
        return col ? col.toString() : '<i>N/A</i>';
      }
    }).column('updated_at', {
      'sort'   : true,
      'title'  : 'Last Online',
      'format' : async (col) => {
        return col ? col.toLocaleDateString('en-GB', {
          'day'   : 'numeric',
          'month' : 'short',
          'year'  : 'numeric'
        }) : '<i>N/A</i>';
      }
    }).column('created_at', {
      'sort'   : true,
      'title'  : 'Registered',
      'format' : async (col) => {
        return col ? col.toLocaleDateString('en-GB', {
          'day'   : 'numeric',
          'month' : 'short',
          'year'  : 'numeric'
        }) : '<i>N/A</i>';
      }
    }).column('actions', {
      'type'   : false,
      'width'  : '1%',
      'title'  : 'Actions',
      'format' : async (col, row) => {
        return [
          '<div class="btn-group btn-group-sm" role="group">',
          '<a href="/admin/user/' + row.get('_id').toString() + '/update" class="btn btn-primary">',
          '<i class="fa fa-pencil"></i>',
          '</a>',
          '<a href="/admin/user/' + row.get('_id').toString() + '/remove" class="btn btn-danger">',
          '<i class="fa fa-times"></i>',
          '</a>',
          '</div>'
        ].join('');
      }
    });

    // Add grid filters
    userGrid.filter('username', {
      'title' : 'Username',
      'type'  : 'text',
      'query' : async (param) => {
        // Another where
        userGrid.where({
          'username' : new RegExp(escapeRegex(param.toString().toLowerCase()), 'i')
        });
      }
    }).filter('email', {
      'title' : 'Email',
      'type'  : 'text',
      'query' : async (param) => {
        // Another where
        userGrid.where({
          'email' : new RegExp(escapeRegex(param.toString().toLowerCase()), 'i')
        });
      }
    });

    // Set default sort order
    userGrid.sort('created_at', 1);

    // Return grid
    return userGrid;
  }
}

/**
 * Export admin controller
 *
 * @type {admin}
 */
exports = module.exports = admin;
