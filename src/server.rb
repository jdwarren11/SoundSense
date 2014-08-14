require 'sinatra'
require 'sinatra/contrib/all'
require 'sinatra/json'
require "net/http"
require "uri"
require 'json'
require 'http'

set :bind, '0.0.0.0'

get '/' do
  erb :index
end

post '/proxy' do
  body_parameters = request.body.read
  puts "BODY: #{body_parameters}"
  params.merge!(JSON.parse(body_parameters))
  puts "ALL PARAMS: #{params.inspect}"
  
  api_params = {
    apikey: params[:apikey], text: params[:text], outputMode: params[:outputMode], sentiment: params[:sentiment]
  }
  #api_params = {:apikey=>"10964186d4b805e210bb0ae5208c03f319159853", :text=>"test", :outputMode=>"json"}

  puts "Params: #{params[:api_params]}"
  puts "URL: #{params[:url]}"

  uri = URI.parse(params[:url])
  puts "Parsed URL: #{uri}"

  response = HTTP.post 'http://access.alchemyapi.com/calls/text/TextGetRankedKeywords', :params => api_params
  # JSON.parse(response.body)
  # response['keywords'].each 
  puts response
  puts response.class

  content_type :json
  response.to_json

  # Full control
  # http = Net::HTTP.new(uri.host, uri.port)

  # request = Net::HTTP::Post.new(uri.request_uri)
  # request.set_form_data(api_params)

  # response = http.request(request)
  # puts response.body
  # response.body
end
